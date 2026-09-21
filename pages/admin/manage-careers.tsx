import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import {
  JobCircular,
  JobApplication,
  JobStatus,
  ApplicationStatus,
} from "@/types/career";
import { moveToBin } from "@/lib/services/binService";
import {
  getAllCircularsAdmin,
  createCircular,
  updateCircular,
  deleteCircular,
  seedInitialCircular,
  getApplicationsAdmin,
  updateApplicationStatus,
  deleteApplication,
  INITIAL_SENIOR_UI_UX_CIRCULAR,
} from "@/lib/services/careerService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

interface CircularFormState {
  id?: string;
  title: string;
  department: string;
  employmentType: "Full-time" | "Part-time" | "Contract" | "Remote";
  location: string;
  experienceLevel: string;
  salaryRange: string;
  overview: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  skills: string;
  status: JobStatus;
  deadline: string;
  deadlineDate: string;
  order: number;
}

const EMPTY_CIRCULAR_FORM: CircularFormState = {
  title: "",
  department: "Spatial Product Design & Systems",
  employmentType: "Full-time",
  location: "Remote / Worldwide",
  experienceLevel: "Senior (3+ Years)",
  salaryRange: "$1,200 – $2,200 / month",
  overview: "",
  responsibilities: "",
  requirements: "",
  benefits: "",
  skills: "Figma, Design Systems, UI/UX",
  status: "open",
  deadline: "October 15, 2026",
  deadlineDate: "2026-10-15T23:59:59Z",
  order: 1,
};

export default function ManageCareersPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"circulars" | "applications">("circulars");

  // Circulars State
  const [circulars, setCirculars] = useState<JobCircular[]>([]);
  const [loadingCirculars, setLoadingCirculars] = useState(true);
  const [circularModalOpen, setCircularModalOpen] = useState(false);
  const [circularForm, setCircularForm] = useState<CircularFormState>(EMPTY_CIRCULAR_FORM);
  const [savingCircular, setSavingCircular] = useState(false);
  const [deleteCircularTarget, setDeleteCircularTarget] = useState<JobCircular | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState("");

  // Applications State
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [appFilter, setAppFilter] = useState<"all" | ApplicationStatus>("all");
  const [selectedNoteApp, setSelectedNoteApp] = useState<JobApplication | null>(null);
  const [deleteAppTarget, setDeleteAppTarget] = useState<JobApplication | null>(null);

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

  // Load Data
  useEffect(() => {
    if (!isAdmin) return;

    async function loadData() {
      try {
        const [cList, aList] = await Promise.all([
          getAllCircularsAdmin(),
          getApplicationsAdmin(),
        ]);
        setCirculars(cList);
        setApplications(aList);
      } catch (err) {
        console.error("Error loading career admin data:", err);
      } finally {
        setLoadingCirculars(false);
        setLoadingApplications(false);
      }
    }
    loadData();
  }, [isAdmin]);

  // Circular Handlers
  const openAddCircularModal = () => {
    setCircularForm({
      ...EMPTY_CIRCULAR_FORM,
      order: circulars.length + 1,
    });
    setCircularModalOpen(true);
  };

  const openEditCircularModal = (c: JobCircular) => {
    setCircularForm({
      id: c.id,
      title: c.title,
      department: c.department,
      employmentType: c.employmentType,
      location: c.location,
      experienceLevel: c.experienceLevel,
      salaryRange: c.salaryRange,
      overview: c.overview,
      responsibilities: c.responsibilities.join("\n"),
      requirements: c.requirements.join("\n"),
      benefits: c.benefits?.join("\n") || "",
      skills: c.skills?.join(", ") || "",
      status: c.status,
      deadline: c.deadline || "",
      deadlineDate: c.deadlineDate || "",
      order: c.order || 1,
    });
    setCircularModalOpen(true);
  };

  const handleSaveCircular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!circularForm.title.trim() || !circularForm.overview.trim()) {
      alert("Title and Overview are required.");
      return;
    }

    setSavingCircular(true);
    try {
      const responsibilities = circularForm.responsibilities
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const requirements = circularForm.requirements
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const benefits = circularForm.benefits
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const skills = circularForm.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        title: circularForm.title.trim(),
        department: circularForm.department.trim(),
        employmentType: circularForm.employmentType,
        location: circularForm.location.trim(),
        experienceLevel: circularForm.experienceLevel.trim(),
        salaryRange: circularForm.salaryRange.trim(),
        overview: circularForm.overview.trim(),
        responsibilities,
        requirements,
        benefits,
        skills,
        status: circularForm.status,
        deadline: circularForm.deadline.trim() || undefined,
        deadlineDate: circularForm.deadlineDate ? circularForm.deadlineDate : undefined,
        order: Number(circularForm.order) || 1,
      };

      if (circularForm.id) {
        await updateCircular(circularForm.id, payload);
      } else {
        await createCircular(payload);
      }

      const refreshed = await getAllCircularsAdmin();
      setCirculars(refreshed);
      setCircularModalOpen(false);
      setNotice("✓ Circular saved successfully!");
      setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      console.error("Error saving circular:", err);
      alert("Failed to save job circular.");
    } finally {
      setSavingCircular(false);
    }
  };

  const handleToggleCircularStatus = async (c: JobCircular) => {
    const nextStatus: JobStatus = c.status === "open" ? "closed" : "open";
    try {
      setCirculars((prev) =>
        prev.map((item) => (item.id === c.id ? { ...item, status: nextStatus } : item))
      );
      await updateCircular(c.id, { status: nextStatus });
    } catch (err) {
      console.error("Error updating circular status:", err);
    }
  };

  const [deletingCircular, setDeletingCircular] = useState(false);

  const confirmMoveCircularToBin = async () => {
    if (!deleteCircularTarget) return;
    setDeletingCircular(true);
    try {
      await moveToBin({
        originalCollection: "jobCirculars",
        originalId: deleteCircularTarget.id,
        itemTitle: `${deleteCircularTarget.title} (${deleteCircularTarget.department})`,
        itemType: "Job Circular",
        data: deleteCircularTarget,
        metadata: {
          department: deleteCircularTarget.department,
          status: deleteCircularTarget.status,
          salaryRange: deleteCircularTarget.salaryRange,
        },
      });
      setCirculars((prev) => prev.filter((item) => item.id !== deleteCircularTarget.id));
      setDeleteCircularTarget(null);
      setNotice("✓ Circular moved to Recycle Bin.");
      setTimeout(() => setNotice(""), 4000);
    } catch (err: any) {
      console.error("Error moving circular to bin:", err);
      alert("Failed to move circular to bin: " + (err?.message || "Unknown error"));
    } finally {
      setDeletingCircular(false);
    }
  };

  const handleSeedSeniorUiUx = async () => {
    setSeeding(true);
    setNotice("");
    try {
      await seedInitialCircular();
      const refreshed = await getAllCircularsAdmin();
      setCirculars(refreshed);
      setNotice("✓ Successfully synced Senior UI/UX Designer circular to database!");
      setTimeout(() => setNotice(""), 5000);
    } catch (err) {
      console.error("Error seeding circular:", err);
      alert("Failed to seed circular to database.");
    } finally {
      setSeeding(false);
    }
  };

  // Application Handlers
  const handleUpdateAppStatus = async (id: string, status: ApplicationStatus) => {
    try {
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status } : a))
      );
      await updateApplicationStatus(id, status);
    } catch (err) {
      console.error("Error updating application status:", err);
    }
  };

  const [deletingApp, setDeletingApp] = useState(false);

  const confirmMoveAppToBin = async () => {
    if (!deleteAppTarget) return;
    setDeletingApp(true);
    try {
      await moveToBin({
        originalCollection: "jobApplications",
        originalId: deleteAppTarget.id,
        itemTitle: `${deleteAppTarget.applicantName} - ${deleteAppTarget.jobTitle}`,
        itemType: "Job Application",
        data: deleteAppTarget,
        metadata: {
          jobTitle: deleteAppTarget.jobTitle,
          email: deleteAppTarget.email,
          status: deleteAppTarget.status,
        },
      });
      setApplications((prev) => prev.filter((a) => a.id !== deleteAppTarget.id));
      setDeleteAppTarget(null);
      setNotice("✓ Candidate application dossier moved to Recycle Bin.");
      setTimeout(() => setNotice(""), 4000);
    } catch (err: any) {
      console.error("Error moving application to bin:", err);
      alert("Failed to move application to bin: " + (err?.message || "Unknown error"));
    } finally {
      setDeletingApp(false);
    }
  };

  const filteredApplications = applications.filter((a) => {
    if (appFilter === "all") return true;
    return a.status === appFilter;
  });

  if (!authReady || !isAdmin) {
    return (
    <AdminLayout>
        <Head>
          <title>Careers Admin | DevEngine</title>
        </Head>
        <main className="px-6 md:px-8 py-8 min-h-[calc(100vh-56px)] text-white">
          <HelixLoader size={48} color="#3EF3FF" />
          <p className="mt-4 text-xs font-jetbrains text-gray-400 uppercase tracking-widest">
            Verifying Architectural Access…
          </p>
        </main>
    </AdminLayout>
  );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Careers &amp; Recruitment CMS | DevEngine Admin</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap"
          rel="stylesheet"
        />
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
                  CAREERS & TALENT
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Recruitment & Job Circulars
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-jetbrains font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE FIRESTORE
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Publish career circulars, configure compensation tiers, and review candidate dossiers.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/career"
                target="_blank"
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 hover:text-white text-xs font-jetbrains font-semibold tracking-wider transition-all flex items-center gap-2"
              >
                <span>VIEW CAREERS PAGE</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </Link>
            </div>
          </div>

          {notice && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-jetbrains text-xs flex items-center gap-2 animate-fadeIn">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>{notice}</span>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl p-2 rounded-2xl shadow-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("circulars")}
              className={`px-6 py-2.5 rounded-xl font-jetbrains text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === "circulars"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-black shadow-lg shadow-teal-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">work</span>
              <span>Job Circulars ({circulars.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("applications")}
              className={`px-6 py-2.5 rounded-xl font-jetbrains text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === "applications"
                  ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-black shadow-lg shadow-teal-500/20"
                  : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">assignment_ind</span>
              <span>Candidate Applications ({applications.length})</span>
            </button>
          </div>

          {/* TAB 1: JOB CIRCULARS */}
          {activeTab === "circulars" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl p-6 rounded-3xl shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
                    Active & Draft Circulars
                  </h2>
                  <p className="text-gray-400 text-xs mt-1">
                    Publish positions, update salary parameters, and manage hiring requirements.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={seeding}
                    onClick={handleSeedSeniorUiUx}
                    className="px-4 py-2.5 rounded-xl bg-teal-500/5 hover:bg-teal-500/15 border border-teal-500/30 text-teal-300 font-jetbrains text-xs font-semibold tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    title="Populate or update Senior UI/UX Designer circular into Firestore"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {seeding ? "sync" : "cloud_sync"}
                    </span>
                    <span>{seeding ? "SEEDING…" : "SEED SENIOR UI/UX CIRCULAR"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={openAddCircularModal}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-jetbrains text-xs font-bold tracking-wider transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>POST NEW CIRCULAR</span>
                  </button>
                </div>
              </div>

              {loadingCirculars ? (
                <div className="min-h-[50vh] flex flex-col items-center justify-center py-20">
                  <HelixLoader size={45} color="#14b8a6" />
                  <p className="mt-4 text-xs font-jetbrains text-gray-400 uppercase tracking-widest">
                    Loading Circulars…
                  </p>
                </div>
              ) : circulars.length === 0 ? (
                <div className="py-24 text-center rounded-3xl border border-white/[0.08] bg-[#0c0c16]/95 backdrop-blur-xl shadow-xl">
                  <span className="material-symbols-outlined text-gray-600 text-5xl mb-3">
                    work_outline
                  </span>
                  <p className="text-gray-300 font-semibold text-base">No circulars posted yet</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Click &quot;Seed Senior UI/UX Circular&quot; above to initialize the designer post.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {circulars.map((c) => (
                    <div
                      key={c.id}
                      className="p-6 sm:p-8 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] hover:border-teal-500/30 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-200 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 group"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-jetbrains uppercase tracking-wider font-bold ${
                              c.status === "open"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-gray-700/30 text-gray-400 border border-gray-600"
                            }`}
                          >
                            {c.status.toUpperCase()}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 font-jetbrains text-[10px] text-teal-400 font-medium">
                            {c.department}
                          </span>
                          <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] font-jetbrains text-[10px] text-gray-400">
                            {c.employmentType} · {c.location}
                          </span>
                        </div>

                        <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
                          {c.title}
                        </h3>

                        <p className="text-gray-300 text-xs sm:text-sm line-clamp-2 max-w-3xl leading-relaxed">
                          {c.overview}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-xs font-jetbrains text-gray-400 pt-1">
                          <span className="text-teal-400 font-semibold">
                            Salary: {c.salaryRange}
                          </span>
                          <span>•</span>
                          <span>Experience: {c.experienceLevel}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end border-t lg:border-t-0 pt-4 lg:pt-0 border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => handleToggleCircularStatus(c)}
                          className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-xs font-jetbrains text-gray-300 hover:text-white cursor-pointer transition-all"
                        >
                          {c.status === "open" ? "CLOSE ROLE" : "OPEN ROLE"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditCircularModal(c)}
                          className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-xs font-jetbrains text-gray-300 hover:text-white flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                          <span>EDIT</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeleteCircularTarget(c)}
                          className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-jetbrains flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                          <span>DELETE</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CANDIDATE APPLICATIONS */}
          {activeTab === "applications" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl p-6 rounded-3xl shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
                    Applicant Dossiers & Submissions
                  </h2>
                  <p className="text-gray-400 text-xs mt-1">
                    Review applicant resumes, portfolios, and contact communication channels.
                  </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap items-center gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/[0.08]">
                  {(["all", "new", "reviewing", "shortlisted", "rejected"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setAppFilter(tab)}
                      className={`px-3.5 py-1.5 rounded-xl font-jetbrains text-[10px] font-bold uppercase transition-all cursor-pointer ${
                        appFilter === tab
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-black shadow-md shadow-teal-500/20"
                          : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                      }`}
                    >
                      {tab} ({tab === "all" ? applications.length : applications.filter((a) => a.status === tab).length})
                    </button>
                  ))}
                </div>
              </div>

              {loadingApplications ? (
                <div className="min-h-[50vh] flex flex-col items-center justify-center py-20">
                  <HelixLoader size={45} color="#14b8a6" />
                  <p className="mt-4 text-xs font-jetbrains text-gray-400 uppercase tracking-widest">
                    Loading Applications…
                  </p>
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="py-24 text-center rounded-3xl border border-white/[0.08] bg-[#0c0c16]/95 backdrop-blur-xl shadow-xl">
                  <span className="material-symbols-outlined text-gray-600 text-5xl mb-3">
                    inbox
                  </span>
                  <p className="text-gray-300 font-semibold text-base">
                    No applications in this category
                  </p>
                  <p className="text-gray-500 text-xs mt-1">
                    Candidates applying from the public career page will appear here immediately.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredApplications.map((app) => (
                    <div
                      key={app.id}
                      className="p-6 sm:p-8 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] hover:border-teal-500/30 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-200 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-jetbrains uppercase tracking-wider font-bold ${
                                app.status === "new"
                                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                                  : app.status === "shortlisted"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : app.status === "reviewing"
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                                  : "bg-red-500/10 text-red-400 border border-red-500/30"
                              }`}
                            >
                              {app.status.toUpperCase()}
                            </span>
                            <span className="text-xs font-jetbrains text-gray-400">
                              Applied on {new Date(app.appliedAt).toLocaleDateString()}
                            </span>
                          </div>

                          <h3 className="text-xl font-bold text-white font-['Space_Grotesk']">
                            {app.applicantName}
                          </h3>
                          <p className="text-xs font-jetbrains text-teal-400 mt-0.5">
                            Applying for: {app.jobTitle} ({app.experienceYears})
                          </p>
                        </div>

                        {/* Status Action Buttons */}
                        <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/[0.08]">
                          <button
                            type="button"
                            onClick={() => handleUpdateAppStatus(app.id, "reviewing")}
                            className={`px-3 py-1 rounded-lg text-[10px] font-jetbrains uppercase transition-all cursor-pointer ${
                              app.status === "reviewing"
                                ? "bg-amber-400 text-black font-bold shadow-sm"
                                : "text-gray-400 hover:text-white"
                            }`}
                          >
                            Reviewing
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAppStatus(app.id, "shortlisted")}
                            className={`px-3 py-1 rounded-lg text-[10px] font-jetbrains uppercase transition-all cursor-pointer ${
                              app.status === "shortlisted"
                                ? "bg-emerald-400 text-black font-bold shadow-sm"
                                : "text-gray-400 hover:text-white"
                            }`}
                          >
                            Shortlist
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateAppStatus(app.id, "rejected")}
                            className={`px-3 py-1 rounded-lg text-[10px] font-jetbrains uppercase transition-all cursor-pointer ${
                              app.status === "rejected"
                                ? "bg-red-500 text-white font-bold shadow-sm"
                                : "text-gray-400 hover:text-white"
                            }`}
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      {/* Applicant details & Links */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                        <div className="space-y-1 text-xs font-jetbrains">
                          <span className="text-gray-500 uppercase block text-[10px]">
                            Contact Information
                          </span>
                          <p className="text-white flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-gray-400">
                              mail
                            </span>
                            <a href={`mailto:${app.email}`} className="hover:text-teal-400 hover:underline">
                              {app.email}
                            </a>
                          </p>
                          <p className="text-gray-300 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-gray-400">
                              call
                            </span>
                            <span>{app.phone}</span>
                          </p>
                        </div>

                        <div className="space-y-2 text-xs font-jetbrains">
                          <span className="text-gray-500 uppercase block text-[10px]">
                            Credentials & Resume
                          </span>
                          <div className="flex flex-wrap gap-2">
                            <a
                              href={app.resumeDriveLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3.5 py-1.5 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/40 font-bold flex items-center gap-1.5 transition"
                              title="Open Google Drive / Cloud Resume"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                cloud_download
                              </span>
                              <span>OPEN RESUME (DRIVE) ↗</span>
                            </a>

                            {app.portfolioUrl && (
                              <a
                                href={app.portfolioUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-white border border-white/[0.08] flex items-center gap-1.5 transition"
                                title="Open Portfolio / Figma"
                              >
                                <span className="material-symbols-outlined text-[15px]">
                                  open_in_new
                                </span>
                                <span>PORTFOLIO ↗</span>
                              </a>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 text-xs font-jetbrains flex flex-col justify-between">
                          <div>
                            <span className="text-gray-500 uppercase block text-[10px]">
                              Cover Pitch
                            </span>
                            {app.coverNote ? (
                              <button
                                type="button"
                                onClick={() => setSelectedNoteApp(app)}
                                className="text-left text-xs text-gray-300 hover:text-teal-400 underline underline-offset-4 cursor-pointer line-clamp-2"
                              >
                                &quot;{app.coverNote}&quot;
                              </button>
                            ) : (
                              <span className="text-gray-500 text-xs italic">
                                No cover note provided
                              </span>
                            )}
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              type="button"
                              onClick={() => setDeleteAppTarget(app)}
                              className="text-rose-400 hover:text-rose-300 text-xs font-jetbrains flex items-center gap-1.5 cursor-pointer transition-colors"
                            >
                              <span className="material-symbols-outlined text-[15px]">
                                delete
                              </span>
                              <span>Delete Dossier</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ADD / EDIT CIRCULAR MODAL (Bounded Container) */}
      {circularModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-3xl max-h-[90vh] bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
            {/* Pinned Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div>
                <span className="font-jetbrains text-[10px] text-teal-400 uppercase tracking-widest font-bold">
                  RECRUITMENT DIRECTORY
                </span>
                <h3 className="text-2xl font-bold text-white font-['Space_Grotesk'] mt-0.5">
                  {circularForm.id ? "Edit Job Circular" : "Post New Job Circular"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCircularModalOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveCircular} id="circularFormElement" className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Role Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={circularForm.title}
                    onChange={(e) =>
                      setCircularForm({ ...circularForm, title: e.target.value })
                    }
                    placeholder="e.g., Senior UI/UX Designer"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Department / Domain *
                  </label>
                  <input
                    type="text"
                    required
                    value={circularForm.department}
                    onChange={(e) =>
                      setCircularForm({ ...circularForm, department: e.target.value })
                    }
                    placeholder="e.g., Spatial Product Design & Systems"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Employment Type
                  </label>
                  <div className="relative">
                    <select
                      value={circularForm.employmentType}
                      onChange={(e) =>
                        setCircularForm({
                          ...circularForm,
                          employmentType: e.target.value as any,
                        })
                      }
                      className="w-full h-11 appearance-none bg-black/40 border border-white/[0.08] rounded-xl px-4 pr-10 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-colors"
                    >
                      <option value="Full-time" className="bg-[#0c0c16] text-white">Full-time</option>
                      <option value="Part-time" className="bg-[#0c0c16] text-white">Part-time</option>
                      <option value="Contract" className="bg-[#0c0c16] text-white">Contract</option>
                      <option value="Remote" className="bg-[#0c0c16] text-white">Remote</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Location
                  </label>
                  <input
                    type="text"
                    value={circularForm.location}
                    onChange={(e) =>
                      setCircularForm({ ...circularForm, location: e.target.value })
                    }
                    placeholder="e.g., Remote / Worldwide"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Experience Level
                  </label>
                  <input
                    type="text"
                    value={circularForm.experienceLevel}
                    onChange={(e) =>
                      setCircularForm({
                        ...circularForm,
                        experienceLevel: e.target.value,
                      })
                    }
                    placeholder="e.g., Senior (3+ Years)"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Salary Range / Compensation
                  </label>
                  <input
                    type="text"
                    value={circularForm.salaryRange}
                    onChange={(e) =>
                      setCircularForm({
                        ...circularForm,
                        salaryRange: e.target.value,
                      })
                    }
                    placeholder="e.g., $1,200 – $2,200 / month"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={circularForm.status}
                      onChange={(e) =>
                        setCircularForm({
                          ...circularForm,
                          status: e.target.value as JobStatus,
                        })
                      }
                      className="w-full h-11 appearance-none bg-black/40 border border-white/[0.08] rounded-xl px-4 pr-10 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-colors"
                    >
                      <option value="open" className="bg-[#0c0c16] text-white">OPEN (Accepting Applications)</option>
                      <option value="closed" className="bg-[#0c0c16] text-white">CLOSED (Archived / Hired)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-gray-400">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                  Role Overview *
                </label>
                <textarea
                  rows={3}
                  required
                  value={circularForm.overview}
                  onChange={(e) =>
                    setCircularForm({ ...circularForm, overview: e.target.value })
                  }
                  placeholder="Summary of this engineering or design position..."
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Responsibilities (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={circularForm.responsibilities}
                    onChange={(e) =>
                      setCircularForm({
                        ...circularForm,
                        responsibilities: e.target.value,
                      })
                    }
                    placeholder="Enter each responsibility on a new line..."
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Requirements (One per line)
                  </label>
                  <textarea
                    rows={4}
                    value={circularForm.requirements}
                    onChange={(e) =>
                      setCircularForm({
                        ...circularForm,
                        requirements: e.target.value,
                      })
                    }
                    placeholder="Enter each qualification on a new line..."
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Perks & Benefits (One per line)
                  </label>
                  <textarea
                    rows={3}
                    value={circularForm.benefits}
                    onChange={(e) =>
                      setCircularForm({ ...circularForm, benefits: e.target.value })
                    }
                    placeholder="Flexible working hours, Hardware stipend, Remote work..."
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Required Skills (Comma-separated)
                  </label>
                  <textarea
                    rows={3}
                    value={circularForm.skills}
                    onChange={(e) =>
                      setCircularForm({ ...circularForm, skills: e.target.value })
                    }
                    placeholder="Figma, Design Systems, UX Wireframing, Prototyping"
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Display Deadline Label
                  </label>
                  <input
                    type="text"
                    value={circularForm.deadline}
                    onChange={(e) =>
                      setCircularForm({ ...circularForm, deadline: e.target.value })
                    }
                    placeholder="e.g., October 15, 2026"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Countdown Target (Date for Live Ticker)
                  </label>
                  <input
                    type="date"
                    value={circularForm.deadlineDate ? circularForm.deadlineDate.slice(0, 10) : ""}
                    onChange={(e) =>
                      setCircularForm({
                        ...circularForm,
                        deadlineDate: e.target.value ? `${e.target.value}T23:59:59Z` : "",
                      })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-white/[0.08] flex items-center justify-end gap-3 shrink-0 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setCircularModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white font-jetbrains text-xs font-semibold cursor-pointer transition-colors"
              >
                CANCEL
              </button>

              <button
                type="submit"
                form="circularFormElement"
                disabled={savingCircular}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-jetbrains text-xs font-bold tracking-wider uppercase transition shadow-lg shadow-teal-500/20 cursor-pointer disabled:opacity-50"
              >
                {savingCircular ? "SAVING CIRCULAR…" : "SAVE JOB CIRCULAR"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COVER NOTE MODAL */}
      {selectedNoteApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <h4 className="text-lg font-bold text-white font-['Space_Grotesk']">
                Cover Note — {selectedNoteApp.applicantName}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedNoteApp(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-gray-300 leading-relaxed font-sans whitespace-pre-wrap max-h-[60vh] overflow-y-auto custom-scrollbar">
              {selectedNoteApp.coverNote}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedNoteApp(null)}
                className="px-5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-jetbrains text-xs cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECYCLE BIN CONFIRM DELETE CIRCULAR MODAL */}
      {deleteCircularTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <span className="material-symbols-outlined text-[24px]">delete</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Move Circular to Bin?
                </h3>
                <p className="text-xs font-jetbrains text-gray-400">
                  Item will be retained for 30 days before permanent purging.
                </p>
              </div>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">
              Are you sure you want to move the circular for{" "}
              <strong className="text-white">&quot;{deleteCircularTarget.title}&quot;</strong> to the Recycle Bin?
            </p>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed font-jetbrains">
              💡 You can restore this job circular anytime from <strong>Dashboard &gt; Recycle Bin</strong>.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deletingCircular}
                onClick={() => setDeleteCircularTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-jetbrains text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={deletingCircular}
                onClick={confirmMoveCircularToBin}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-jetbrains font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-500/20"
              >
                {deletingCircular ? "MOVING..." : "MOVE TO RECYCLE BIN"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECYCLE BIN CONFIRM DELETE APPLICATION MODAL */}
      {deleteAppTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-md bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <span className="material-symbols-outlined text-[24px]">delete</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Move Application to Bin?
                </h3>
                <p className="text-xs font-jetbrains text-gray-400">
                  Item will be retained for 30 days before permanent purging.
                </p>
              </div>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">
              Are you sure you want to move the application dossier submitted by{" "}
              <strong className="text-white">&quot;{deleteAppTarget.applicantName}&quot;</strong> to the Recycle Bin?
            </p>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed font-jetbrains">
              💡 You can restore this application anytime from <strong>Dashboard &gt; Recycle Bin</strong>.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deletingApp}
                onClick={() => setDeleteAppTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-jetbrains text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={deletingApp}
                onClick={confirmMoveAppToBin}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-jetbrains font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-500/20"
              >
                {deletingApp ? "MOVING..." : "MOVE TO RECYCLE BIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
