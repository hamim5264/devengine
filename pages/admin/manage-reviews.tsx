import React, { useEffect, useState, useMemo } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { ReviewRecord, ReviewStatus } from "@/types/review";
import { moveToBin } from "@/lib/services/binService";
import {
  getAllReviewsAdmin,
  updateReviewStatus,
  toggleFeatureReview,
  deleteReview,
  saveReviewAdmin,
  seedDefaultReviews,
} from "@/lib/services/reviewsService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

interface FormState {
  id?: string;
  reviewerName: string;
  reviewerRole: string;
  company: string;
  rating: number;
  reviewText: string;
  status: ReviewStatus;
  featured: boolean;
}

const EMPTY_FORM: FormState = {
  reviewerName: "",
  reviewerRole: "Client / Developer",
  company: "",
  rating: 5,
  reviewText: "",
  status: "APPROVED",
  featured: false,
};

export default function ManageReviewsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReviewRecord | null>(null);

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

  // Load reviews
  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await getAllReviewsAdmin();
      setReviews(data);
    } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const [seeding, setSeeding] = useState(false);

  const handleSeedDefaults = async () => {
    if (!confirm("Seed or restore the 3 default user-side reviews (Shirajom Monira, Alex Rivera, Elena Lin) to Firestore?")) {
      return;
    }
    setSeeding(true);
    try {
      const count = await seedDefaultReviews();
      alert(`Successfully seeded ${count} reviews into Firestore!`);
      await loadReviews();
    } catch (err: any) {
      alert("Failed to seed reviews: " + (err?.message || "Unknown error"));
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadReviews();
    }
  }, [isAdmin]);

  // Handlers
  const handleStatusChange = async (id: string, newStatus: ReviewStatus) => {
    try {
      // Optimistic update
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      await updateReviewStatus(id, newStatus);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status.");
      loadReviews();
    }
  };

  const handleToggleFeature = async (id: string, currentFeatured: boolean) => {
    try {
      setReviews((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, featured: !currentFeatured } : r
        )
      );
      await toggleFeatureReview(id, !currentFeatured);
    } catch (err) {
      console.error("Failed to toggle feature:", err);
      alert("Failed to toggle feature.");
      loadReviews();
    }
  };

  const [deleting, setDeleting] = useState(false);

  const confirmMoveReviewToBin = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await moveToBin({
        originalCollection: "reviews",
        originalId: deleteTarget.id,
        itemTitle: `${deleteTarget.reviewerName} (${deleteTarget.rating}★ Testimonial)`,
        itemType: "Review / Testimonial",
        data: deleteTarget,
        metadata: {
          reviewerRole: deleteTarget.reviewerRole || "",
          company: deleteTarget.company || "",
          status: deleteTarget.status || "APPROVED",
        },
      });
      setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Failed to move review to recycle bin:", err);
      alert("Failed to move review to recycle bin: " + (err?.message || "Unknown error"));
      loadReviews();
    } finally {
      setDeleting(false);
    }
  };

  const openCreateModal = () => {
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditModal = (r: ReviewRecord) => {
    setForm({
      id: r.id,
      reviewerName: r.reviewerName,
      reviewerRole: r.reviewerRole || "Client / Developer",
      company: r.company || "",
      rating: r.rating,
      reviewText: r.reviewText,
      status: r.status,
      featured: !!r.featured,
    });
    setModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reviewerName || !form.reviewText) {
      alert("Name and Review are required.");
      return;
    }

    setSaving(true);
    try {
      await saveReviewAdmin(form.id || null, {
        reviewerName: form.reviewerName,
        reviewerRole: form.reviewerRole,
        company: form.company,
        rating: form.rating,
        reviewText: form.reviewText,
        status: form.status,
        featured: form.featured,
      });

      setModalOpen(false);
      loadReviews();
    } catch (err) {
      console.error("Failed to save review:", err);
      alert("Failed to save review.");
    } finally {
      setSaving(false);
    }
  };

  // Derived counts
  const countTotal = reviews.length;
  const countPending = reviews.filter((r) => r.status === "PENDING").length;
  const countApproved = reviews.filter((r) => r.status === "APPROVED" || !r.status).length;
  const countFeatured = reviews.filter((r) => r.featured).length;

  // Filtered reviews
  const filtered = useMemo(() => {
    return reviews.filter((r) => {
      const matchStatus =
        statusFilter === "ALL" ||
        r.status === statusFilter ||
        (statusFilter === "APPROVED" && !r.status);

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        r.reviewerName.toLowerCase().includes(q) ||
        (r.reviewerRole && r.reviewerRole.toLowerCase().includes(q)) ||
        (r.company && r.company.toLowerCase().includes(q)) ||
        r.reviewText.toLowerCase().includes(q);

      return matchStatus && matchQuery;
    });
  }, [reviews, statusFilter, searchQuery]);

  if (!authReady || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#02040A] flex flex-col items-center justify-center text-white">
        <HelixLoader size={48} color="#3EF3FF" />
        <p className="mt-4 font-jetbrains text-xs text-gray-400 tracking-widest uppercase">
          Verifying Admin Credentials…
        </p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Manage Reviews & Trust Wall | DevEngine Admin</title>
      </Head>
      <main className="px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-56px)] text-gray-100">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-white/[0.08] pb-6">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/dashboard"
                  className="text-gray-400 hover:text-teal-400 font-jetbrains text-xs tracking-wider transition-colors"
                >
                  ← DASHBOARD
                </Link>
                <span className="text-gray-600">/</span>
                <span className="text-teal-400 font-jetbrains text-xs tracking-widest uppercase font-semibold">
                  CMS ENGINE
                </span>
                <span className="text-gray-600">/</span>
                <span className="text-gray-400 font-jetbrains text-xs tracking-widest uppercase">
                  REVIEWS
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Reviews & Testimonials
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-jetbrains font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE FIRESTORE
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Moderate user submissions, approve or reject client feedback, and curate featured Trust Wall testimonials.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="px-4 py-2.5 rounded-xl border border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/15 text-teal-300 text-xs font-jetbrains font-semibold tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title="Populate with the 3 default featured reviews from user site"
              >
                <span className="material-symbols-outlined text-[16px]">database</span>
                <span>{seeding ? "SYNCING..." : "⚡ SEED DEFAULTS"}</span>
              </button>
              <Link
                href="/reviews"
                target="_blank"
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 hover:text-white text-xs font-jetbrains font-semibold tracking-wider transition-all flex items-center gap-2"
              >
                <span>VIEW TRUST WALL</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </Link>
              <button
                type="button"
                onClick={openCreateModal}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black text-xs font-jetbrains font-bold tracking-wider transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>ADD TESTIMONIAL</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl flex items-center justify-between hover:border-teal-500/30 transition-all duration-200">
              <div>
                <p className="text-xs font-jetbrains text-gray-400 uppercase tracking-wider">
                  Total Reviews
                </p>
                <p className="text-2xl font-bold text-white mt-1">{countTotal}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <span className="material-symbols-outlined text-[22px]">rate_review</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-amber-500/20 backdrop-blur-xl shadow-xl flex items-center justify-between hover:border-amber-500/40 transition-all duration-200">
              <div>
                <p className="text-xs font-jetbrains text-amber-400 uppercase tracking-wider font-semibold">
                  Pending Review
                </p>
                <p className="text-2xl font-bold text-amber-300 mt-1">{countPending}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <span className="material-symbols-outlined text-[22px]">hourglass_top</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-emerald-500/20 backdrop-blur-xl shadow-xl flex items-center justify-between hover:border-emerald-500/40 transition-all duration-200">
              <div>
                <p className="text-xs font-jetbrains text-emerald-400 uppercase tracking-wider">
                  Approved & Live
                </p>
                <p className="text-2xl font-bold text-emerald-300 mt-1">{countApproved}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <span className="material-symbols-outlined text-[22px]">check_circle</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0c0c16]/95 border border-teal-500/20 backdrop-blur-xl shadow-xl flex items-center justify-between hover:border-teal-500/40 transition-all duration-200">
              <div>
                <p className="text-xs font-jetbrains text-teal-400 uppercase tracking-wider">
                  Featured Carousel
                </p>
                <p className="text-2xl font-bold text-teal-300 mt-1">{countFeatured}</p>
              </div>
              <div className="w-11 h-11 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                <span className="material-symbols-outlined text-[22px]">hotel_class</span>
              </div>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl p-3 sm:p-4 rounded-2xl shadow-xl">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {[
                { id: "ALL", label: `All (${countTotal})` },
                { id: "PENDING", label: `Pending (${countPending})` },
                { id: "APPROVED", label: `Approved (${countApproved})` },
                { id: "REJECTED", label: `Rejected` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-jetbrains tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                    statusFilter === tab.id
                      ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-black font-bold shadow-md shadow-teal-500/20"
                      : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[280px]">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reviews, clients, roles..."
                className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
              />
            </div>
          </div>

          {/* Reviews List / Content */}
          {loading ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center py-20">
              <HelixLoader size={45} color="#14b8a6" />
              <p className="mt-4 text-xs font-jetbrains text-gray-400 uppercase tracking-widest">
                Fetching Reviews…
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 text-center rounded-3xl border border-white/[0.08] bg-[#0c0c16]/95 backdrop-blur-xl shadow-xl">
              <span className="material-symbols-outlined text-gray-600 text-5xl mb-3">
                rate_review
              </span>
              <p className="text-gray-300 font-semibold text-base">No reviews found</p>
              <p className="text-gray-500 text-xs mt-1">
                {searchQuery
                  ? "Try adjusting your search query."
                  : "No reviews match the selected filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((rev: ReviewRecord) => {
                const status = rev.status || "APPROVED";
                return (
                  <div
                    key={rev.id}
                    className="p-6 sm:p-7 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] hover:border-teal-500/30 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-200 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6"
                  >
                    {/* Left: Reviewer Details & Feedback */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Rating Stars */}
                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span
                              key={i}
                              className={`material-symbols-outlined text-[18px] ${
                                i < rev.rating
                                  ? "text-amber-400"
                                  : "text-gray-700"
                              }`}
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              star
                            </span>
                          ))}
                        </div>

                        {/* Status Chip */}
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-jetbrains uppercase tracking-wider font-bold ${
                            status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : status === "PENDING"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse"
                              : "bg-red-500/10 text-red-400 border border-red-500/30"
                          }`}
                        >
                          {status}
                        </span>

                        {/* Featured Badge */}
                        {rev.featured && (
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-jetbrains uppercase tracking-wider font-bold bg-teal-500/10 text-teal-400 border border-teal-500/30 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[12px]">star</span>
                            FEATURED
                          </span>
                        )}

                        <span className="text-gray-500 text-xs font-jetbrains">
                          {new Date(rev.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      {/* Review Text */}
                      <p className="text-gray-200 text-sm sm:text-base leading-relaxed italic">
                        "{rev.reviewText}"
                      </p>

                      {/* Reviewer Profile */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center font-jetbrains font-bold text-xs text-teal-300">
                          {rev.reviewerName
                            .split(" ")
                            .map((p: string) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white text-sm font-semibold">
                            {rev.reviewerName}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {rev.reviewerRole}
                            {rev.company ? ` · ${rev.company}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2 self-end lg:self-center border-t lg:border-t-0 pt-3 lg:pt-0 border-white/[0.06] w-full lg:w-auto justify-end">
                      {/* Approve button */}
                      {status !== "APPROVED" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(rev.id, "APPROVED")}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-black text-xs font-jetbrains font-semibold tracking-wider transition-all border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span>
                          <span>APPROVE</span>
                        </button>
                      )}

                      {/* Reject button */}
                      {status !== "REJECTED" && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(rev.id, "REJECTED")}
                          className="px-3.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 text-xs font-jetbrains font-semibold tracking-wider transition-all border border-amber-500/30 flex items-center gap-1.5 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                          <span>REJECT</span>
                        </button>
                      )}

                      {/* Feature toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleFeature(rev.id, !!rev.featured)}
                        title={rev.featured ? "Remove from top carousel" : "Promote to top carousel"}
                        className={`p-2.5 rounded-xl border text-xs font-jetbrains transition-all flex items-center gap-1 cursor-pointer ${
                          rev.featured
                            ? "bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-lg shadow-teal-500/10"
                            : "bg-white/[0.04] text-gray-400 border-white/[0.08] hover:text-white hover:border-white/20"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {rev.featured ? "star" : "star_border"}
                        </span>
                      </button>

                      {/* Edit button */}
                      <button
                        type="button"
                        onClick={() => openEditModal(rev)}
                        className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-gray-300 hover:text-white text-xs transition-all cursor-pointer"
                        title="Edit Review"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>

                      {/* Delete button (Recycle Bin) */}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(rev)}
                        className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs transition-all cursor-pointer"
                        title="Move to Recycle Bin"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Edit / Create Modal (Bounded Container to prevent scrollbar breaking corners) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-xl max-h-[90vh] bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
            {/* Pinned Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">
                  {form.id ? "Edit Testimonial" : "Add Testimonial"}
                </h3>
                <p className="text-xs font-jetbrains text-gray-400 mt-0.5">
                  {form.id ? "Modify client testimonial parameters" : "Publish new verified client testimony"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveModal} id="reviewForm" className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Reviewer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.reviewerName}
                    onChange={(e) =>
                      setForm({ ...form, reviewerName: e.target.value })
                    }
                    placeholder="e.g., Alex Rivera"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={form.reviewerRole}
                    onChange={(e) =>
                      setForm({ ...form, reviewerRole: e.target.value })
                    }
                    placeholder="e.g., Lead Developer"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Project / Company
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) =>
                      setForm({ ...form, company: e.target.value })
                    }
                    placeholder="e.g., TechFlow / Extreme License"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Rating (1 - 5 Stars)
                  </label>
                  <div className="flex items-center gap-2 pt-1.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        type="button"
                        key={s}
                        onClick={() => setForm({ ...form, rating: s })}
                        className="cursor-pointer focus:outline-none transition-transform hover:scale-110"
                      >
                        <span
                          className={`material-symbols-outlined text-[24px] ${
                            s <= form.rating ? "text-amber-400" : "text-gray-700"
                          }`}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          star
                        </span>
                      </button>
                    ))}
                    <span className="text-xs font-jetbrains text-teal-400 font-semibold ml-2">
                      {form.rating} / 5
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                  Testimonial Feedback *
                </label>
                <textarea
                  required
                  rows={4}
                  value={form.reviewText}
                  onChange={(e) =>
                    setForm({ ...form, reviewText: e.target.value })
                  }
                  placeholder="Enter the client testimonial quote..."
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm({ ...form, status: e.target.value as ReviewStatus })
                      }
                      className="w-full h-11 appearance-none bg-black/40 border border-white/[0.08] rounded-xl px-4 pr-10 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-colors"
                    >
                      <option value="APPROVED" className="bg-[#0c0c16] text-white">APPROVED (Live on Trust Wall)</option>
                      <option value="PENDING" className="bg-[#0c0c16] text-white">PENDING (In Moderation)</option>
                      <option value="REJECTED" className="bg-[#0c0c16] text-white">REJECTED (Hidden)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="featuredCheckbox"
                    checked={form.featured}
                    onChange={(e) =>
                      setForm({ ...form, featured: e.target.checked })
                    }
                    className="w-4 h-4 rounded bg-black/40 border border-white/[0.12] text-teal-400 focus:ring-0 cursor-pointer"
                  />
                  <label
                    htmlFor="featuredCheckbox"
                    className="text-xs font-jetbrains text-gray-300 cursor-pointer select-none"
                  >
                    Feature in Top Carousel
                  </label>
                </div>
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-white/[0.08] flex items-center justify-end gap-3 shrink-0 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-jetbrains text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                form="reviewForm"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black text-xs font-jetbrains font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-teal-500/20"
              >
                {saving ? "SAVING…" : "SAVE TESTIMONIAL"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recycle Bin Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <span className="material-symbols-outlined text-[24px]">delete</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Move to Recycle Bin?</h3>
                <p className="text-xs font-jetbrains text-gray-400">
                  Item will be retained for 30 days before permanent purging.
                </p>
              </div>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">
              Are you sure you want to move the testimonial from{" "}
              <span className="text-white font-semibold">
                "{deleteTarget.reviewerName}"
              </span>{" "}
              to the Recycle Bin?
            </p>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed font-jetbrains">
              💡 You can restore this review anytime from <strong>Dashboard &gt; Recycle Bin</strong>.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-jetbrains text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmMoveReviewToBin}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-jetbrains font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-500/20"
              >
                {deleting ? "MOVING..." : "MOVE TO RECYCLE BIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
