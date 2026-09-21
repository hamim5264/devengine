import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { TeamMember, FounderProfile } from "@/types/team";
import { moveToBin } from "@/lib/services/binService";
import { uploadLandingImage } from "@/lib/services/landingService";
import {
  getFounderProfile,
  updateFounderProfile,
  getAllTeamMembersAdmin,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  seedInitialTeam,
  seedFounderProfile,
  DEFAULT_FOUNDER,
} from "@/lib/services/teamService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

interface MemberFormState {
  id?: string;
  name: string;
  role: string;
  bio: string;
  avatarUrl: string;
  skills: string;
  github: string;
  linkedin: string;
  twitter: string;
  email: string;
  order: number;
  isActive: boolean;
}

const EMPTY_MEMBER_FORM: MemberFormState = {
  name: "",
  role: "Shopify Developer",
  bio: "",
  avatarUrl: "/assets/arina_huque_rafa.png",
  skills: "",
  github: "",
  linkedin: "",
  twitter: "",
  email: "",
  order: 1,
  isActive: true,
};

export default function ManageAboutPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"founder" | "team">("founder");

  // Founder State
  const [founder, setFounder] = useState<FounderProfile>(DEFAULT_FOUNDER);
  const [savingFounder, setSavingFounder] = useState(false);
  const [founderSuccess, setFounderSuccess] = useState(false);
  const [achievementsText, setAchievementsText] = useState("");
  const [techBadgesText, setTechBadgesText] = useState("");
  const [founderAvatarTab, setFounderAvatarTab] = useState<"url" | "file">("file");
  const [uploadingFounderAvatar, setUploadingFounderAvatar] = useState(false);

  // Team Members State
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [memberModalOpen, setMemberModalOpen] = useState(false);
  const [memberForm, setMemberForm] = useState<MemberFormState>(EMPTY_MEMBER_FORM);
  const [savingMember, setSavingMember] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TeamMember | null>(null);

  // File Upload State
  const [avatarTab, setAvatarTab] = useState<"url" | "file">("file");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [syncingTeam, setSyncingTeam] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");

  // Founder Avatar Local File Upload Handler
  const handleFounderAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("Image file size exceeds 10MB limit.");
      return;
    }

    try {
      setUploadingFounderAvatar(true);
      const url = await uploadLandingImage(file, "founder");
      setFounder((prev) => ({ ...prev, avatarUrl: url }));
    } catch (err: any) {
      console.error("Failed to upload founder avatar:", err);
      // Base64 fallback
      const reader = new FileReader();
      reader.onload = () => {
        setFounder((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingFounderAvatar(false);
    }
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
  useEffect(() => {
    if (!isAdmin) return;

    async function load() {
      try {
        const fp = await getFounderProfile();
        setFounder(fp);
        setAchievementsText(fp.achievements?.join("\n") || "");
        setTechBadgesText(fp.techBadges?.join(", ") || "");

        const tm = await getAllTeamMembersAdmin();
        setMembers(tm);
      } catch (err) {
        console.error("Error loading about/team data:", err);
      } finally {
        setLoadingTeam(false);
      }
    }
    load();
  }, [isAdmin]);

  // Save Founder info
  const handleSaveFounder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingFounder(true);
    setFounderSuccess(false);

    try {
      const achievements = achievementsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const techBadges = techBadgesText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload: Partial<FounderProfile> = {
        ...founder,
        achievements,
        techBadges,
      };

      await updateFounderProfile(payload);
      setFounder({ ...founder, ...payload });
      setFounderSuccess(true);
      setTimeout(() => setFounderSuccess(false), 4000);
    } catch (err) {
      console.error("Error updating founder profile:", err);
      alert("Failed to update Founder Profile.");
    } finally {
      setSavingFounder(false);
    }
  };

  // Team Member actions
  const openAddMemberModal = () => {
    setMemberForm({
      ...EMPTY_MEMBER_FORM,
      order: members.length + 1,
    });
    setMemberModalOpen(true);
  };

  const openEditMemberModal = (m: TeamMember) => {
    setMemberForm({
      id: m.id,
      name: m.name,
      role: m.role,
      bio: m.bio,
      avatarUrl: m.avatarUrl,
      skills: m.skills?.join(", ") || "",
      github: m.socialLinks?.github || "",
      linkedin: m.socialLinks?.linkedin || "",
      twitter: m.socialLinks?.twitter || "",
      email: m.socialLinks?.email || "",
      order: m.order || 1,
      isActive: m.isActive !== false,
    });
    setMemberModalOpen(true);
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberForm.name.trim() || !memberForm.role.trim()) {
      alert("Name and Role are required.");
      return;
    }

    setSavingMember(true);
    try {
      const skillsArray = memberForm.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: memberForm.name.trim(),
        role: memberForm.role.trim(),
        bio: memberForm.bio.trim(),
        avatarUrl: memberForm.avatarUrl.trim() || "/assets/DevEngine-emblem.png",
        skills: skillsArray,
        socialLinks: {
          github: memberForm.github.trim() || undefined,
          linkedin: memberForm.linkedin.trim() || undefined,
          twitter: memberForm.twitter.trim() || undefined,
          email: memberForm.email.trim() || undefined,
        },
        order: Number(memberForm.order) || 1,
        isActive: memberForm.isActive,
      };

      if (memberForm.id) {
        await updateTeamMember(memberForm.id, payload);
      } else {
        await createTeamMember(payload);
      }

      // Reload
      const refreshed = await getAllTeamMembersAdmin();
      setMembers(refreshed);
      setMemberModalOpen(false);
    } catch (err) {
      console.error("Error saving team member:", err);
      alert("Failed to save team member.");
    } finally {
      setSavingMember(false);
    }
  };

  const [deletingMember, setDeletingMember] = useState(false);

  const confirmMoveMemberToBin = async () => {
    if (!deleteTarget) return;
    setDeletingMember(true);
    try {
      await moveToBin({
        originalCollection: "teamMembers",
        originalId: deleteTarget.id,
        itemTitle: `${deleteTarget.name} (${deleteTarget.role})`,
        itemType: "Team Member",
        data: deleteTarget,
        metadata: {
          role: deleteTarget.role,
          order: deleteTarget.order,
          isActive: deleteTarget.isActive,
        },
      });
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      console.error("Error moving team member to bin:", err);
      alert("Failed to move team member to bin: " + (err?.message || "Unknown error"));
    } finally {
      setDeletingMember(false);
    }
  };

  const handleToggleMemberActive = async (m: TeamMember) => {
    const nextActive = !m.isActive;
    try {
      setMembers((prev) =>
        prev.map((item) =>
          item.id === m.id ? { ...item, isActive: nextActive } : item
        )
      );
      await updateTeamMember(m.id, { isActive: nextActive });
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  const handleLocalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Image file size should be less than 8MB.");
      return;
    }

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        try {
          const res = await fetch("/api/upload-team-avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              base64Data,
            }),
          });
          const data = await res.json();
          if (data.success && data.url) {
            setMemberForm((prev) => ({ ...prev, avatarUrl: data.url }));
          } else {
            setMemberForm((prev) => ({ ...prev, avatarUrl: base64Data }));
          }
        } catch {
          setMemberForm((prev) => ({ ...prev, avatarUrl: base64Data }));
        }
        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Local file upload error:", err);
      alert("Failed to read image file.");
      setUploadingFile(false);
    }
  };

  const handleSyncCoreTeam = async () => {
    setSyncingTeam(true);
    setSyncNotice("");
    try {
      await seedFounderProfile();
      const count = await seedInitialTeam();
      const fp = await getFounderProfile();
      setFounder(fp);
      const tm = await getAllTeamMembersAdmin();
      setMembers(tm);
      setSyncNotice(`✓ Successfully synced Founder & ${count} core team members into database!`);
      setTimeout(() => setSyncNotice(""), 5000);
    } catch (err) {
      console.error("Sync error:", err);
      alert("Failed to sync team members to database.");
    } finally {
      setSyncingTeam(false);
    }
  };

  if (!authReady || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#02040A] flex flex-col items-center justify-center text-white">
        <HelixLoader size={48} color="#3EF3FF" />
        <p className="mt-4 font-jetbrains text-xs text-gray-400 tracking-widest uppercase">
          Verifying Admin Authorization…
        </p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Manage About Us & Team | DevEngine Admin</title>
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
                  ABOUT & TEAM
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1.5">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  About Us & Team Directory
                </h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-jetbrains font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE FIRESTORE
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Manage the Founder & CEO profile, executive portfolio links, and extensible team member directory.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Link
                href="/about"
                target="_blank"
                className="px-4 py-2.5 rounded-xl border border-white/[0.08] hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] text-gray-300 hover:text-white text-xs font-jetbrains font-semibold tracking-wider transition-all flex items-center gap-2"
              >
                <span>VIEW ABOUT PAGE</span>
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>
              </Link>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl p-2 rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("founder")}
                className={`px-5 py-2.5 rounded-xl text-xs font-jetbrains font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "founder"
                    ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-black shadow-lg shadow-teal-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">person</span>
                <span>Founder & CEO Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("team")}
                className={`px-5 py-2.5 rounded-xl text-xs font-jetbrains font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  activeTab === "team"
                    ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-black shadow-lg shadow-teal-500/20"
                    : "text-gray-400 hover:text-white hover:bg-white/[0.05]"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">groups</span>
                <span>Team Members & Employees ({members.length})</span>
              </button>
            </div>

            <Link
              href="/admin/manage-socials"
              className="px-4 py-2 rounded-xl text-xs font-jetbrains font-semibold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 text-gray-400 hover:text-teal-400 hover:bg-white/[0.05] border border-white/[0.08]"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span>Manage Socials →</span>
            </Link>
          </div>

          {/* TAB 1: FOUNDER & CEO PROFILE */}
          {activeTab === "founder" && (
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 sm:p-10 space-y-8 shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
                <div>
                  <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
                    Founder Executive Statement
                  </h2>
                  <p className="text-gray-400 text-xs mt-1">
                    Synced with official portfolio:{" "}
                    <a
                      href={founder.portfolioUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-teal-400 hover:text-teal-300 underline font-jetbrains"
                    >
                      {founder.portfolioUrl}
                    </a>
                  </p>
                </div>

                {founderSuccess && (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-jetbrains font-bold border border-emerald-500/30">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Profile Saved Successfully!
                  </span>
                )}
              </div>

              <form onSubmit={handleSaveFounder} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={founder.name}
                      onChange={(e) =>
                        setFounder({ ...founder, name: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                      Title & Role *
                    </label>
                    <input
                      type="text"
                      required
                      value={founder.title}
                      onChange={(e) =>
                        setFounder({ ...founder, title: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                      Executive Headline *
                    </label>
                    <input
                      type="text"
                      required
                      value={founder.headline}
                      onChange={(e) =>
                        setFounder({ ...founder, headline: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                      CEO Personal Portfolio URL *
                    </label>
                    <input
                      type="url"
                      required
                      value={founder.portfolioUrl}
                      onChange={(e) =>
                        setFounder({ ...founder, portfolioUrl: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider">
                        CEO Portrait Image *
                      </label>
                      <div className="inline-flex p-0.5 bg-black/50 border border-white/[0.08] rounded-lg">
                        <button
                          type="button"
                          onClick={() => setFounderAvatarTab("file")}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                            founderAvatarTab === "file"
                              ? "bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">upload_file</span>
                          Local File
                        </button>
                        <button
                          type="button"
                          onClick={() => setFounderAvatarTab("url")}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-all flex items-center gap-1.5 ${
                            founderAvatarTab === "url"
                              ? "bg-teal-500/20 text-teal-300 font-semibold border border-teal-500/30"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">link</span>
                          Image URL
                        </button>
                      </div>
                    </div>

                    {founderAvatarTab === "file" ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2.5">
                          <label className="flex-1 flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-dashed border-teal-500/30 hover:border-teal-400 bg-teal-500/5 hover:bg-teal-500/10 cursor-pointer transition-all text-xs font-jetbrains text-teal-300">
                            <span className="material-symbols-outlined text-base">
                              {uploadingFounderAvatar ? "hourglass_top" : "cloud_upload"}
                            </span>
                            <span>
                              {uploadingFounderAvatar
                                ? "Uploading image..."
                                : "Upload photo from local disk"}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingFounderAvatar}
                              onChange={handleFounderAvatarUpload}
                              className="hidden"
                            />
                          </label>
                          {founder.avatarUrl !== "/assets/CEO.png" && (
                            <button
                              type="button"
                              onClick={() => setFounder({ ...founder, avatarUrl: "/assets/CEO.png" })}
                              className="h-11 px-3.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.05] text-gray-400 hover:text-white text-xs font-mono transition-colors shrink-0"
                              title="Reset to default /assets/CEO.png"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] font-jetbrains text-gray-500">
                          Supports PNG, JPG, WebP, SVG (saved to cloud storage)
                        </p>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required
                            value={founder.avatarUrl}
                            onChange={(e) =>
                              setFounder({ ...founder, avatarUrl: e.target.value })
                            }
                            placeholder="e.g. /assets/CEO.png or https://example.com/ceo.jpg"
                            className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                          />
                          {founder.avatarUrl !== "/assets/CEO.png" && (
                            <button
                              type="button"
                              onClick={() => setFounder({ ...founder, avatarUrl: "/assets/CEO.png" })}
                              className="h-11 px-3.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.05] text-gray-400 hover:text-white text-xs font-mono transition-colors shrink-0"
                              title="Reset to default /assets/CEO.png"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] font-jetbrains text-gray-500 mt-1.5">
                          Default: <code className="text-teal-400">/assets/CEO.png</code>
                        </p>
                      </div>
                    )}

                    {/* Live Preview Bar */}
                    {founder.avatarUrl && (
                      <div className="flex items-center gap-3 mt-3 p-2.5 rounded-xl bg-black/30 border border-white/[0.06]">
                        <div className="w-11 h-11 rounded-xl overflow-hidden bg-black/60 border border-white/[0.1] shrink-0">
                          <img
                            src={founder.avatarUrl}
                            alt="CEO Avatar Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/assets/CEO.png";
                            }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-mono uppercase text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                            Live Preview
                          </span>
                          <p className="text-xs text-gray-300 font-mono truncate mt-0.5">
                            {founder.avatarUrl.startsWith("data:")
                              ? "Local File (Embedded data URI)"
                              : founder.avatarUrl}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                      Operating Location
                    </label>
                    <input
                      type="text"
                      value={founder.location}
                      onChange={(e) =>
                        setFounder({ ...founder, location: e.target.value })
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                    Bio & Philosophy *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={founder.bio}
                    onChange={(e) =>
                      setFounder({ ...founder, bio: e.target.value })
                    }
                    className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                      Key Milestones & Achievements (One per line)
                    </label>
                    <textarea
                      rows={4}
                      value={achievementsText}
                      onChange={(e) => setAchievementsText(e.target.value)}
                      placeholder="Enter each achievement on a new line..."
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                      Tech Badges (Comma-separated)
                    </label>
                    <textarea
                      rows={4}
                      value={techBadgesText}
                      onChange={(e) => setTechBadgesText(e.target.value)}
                      placeholder="Flutter, Dart, Firebase, Next.js, Python / AI"
                      className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-white/[0.08]">
                  <button
                    type="submit"
                    disabled={savingFounder}
                    className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-jetbrains text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    {savingFounder ? "SAVING PROFILE…" : "UPDATE FOUNDER PROFILE"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: TEAM MEMBERS & EMPLOYEES */}
          {activeTab === "team" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl p-6 rounded-3xl shadow-xl">
                <div>
                  <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
                    Studio Team & Specialists Directory
                  </h2>
                  <p className="text-gray-400 text-xs mt-1">
                    Profiles displayed on the public About page. Easily add, edit, or curate profiles as your studio expands.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={syncingTeam}
                    onClick={handleSyncCoreTeam}
                    className="px-4 py-2.5 rounded-xl bg-teal-500/5 hover:bg-teal-500/15 border border-teal-500/30 text-teal-300 font-jetbrains text-xs font-semibold tracking-wider transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    title="Populate or restore initial core team (Arina, Sabiha, Dhrubo) to database"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {syncingTeam ? "sync" : "cloud_sync"}
                    </span>
                    <span>{syncingTeam ? "SYNCING…" : "SYNC CORE TEAM TO DB"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={openAddMemberModal}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-jetbrains text-xs font-bold tracking-wider transition-all shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">person_add</span>
                    <span>ADD TEAM MEMBER</span>
                  </button>
                </div>
              </div>

              {syncNotice && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-jetbrains text-xs flex items-center gap-2 animate-fadeIn">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  <span>{syncNotice}</span>
                </div>
              )}

              {loadingTeam ? (
                <div className="min-h-[50vh] flex flex-col items-center justify-center py-20">
                  <HelixLoader size={45} color="#14b8a6" />
                  <p className="mt-4 text-xs font-jetbrains text-gray-400 uppercase tracking-widest">
                    Loading Team Directory…
                  </p>
                </div>
              ) : members.length === 0 ? (
                <div className="py-24 text-center rounded-3xl border border-white/[0.08] bg-[#0c0c16]/95 backdrop-blur-xl shadow-xl">
                  <span className="material-symbols-outlined text-gray-600 text-5xl mb-3">
                    groups
                  </span>
                  <p className="text-gray-300 font-semibold text-base">No team members registered yet</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Click "Add Team Member" above to add your first hire or collaborator.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="p-6 sm:p-7 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] hover:border-teal-500/30 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all duration-200 flex flex-col justify-between group"
                    >
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-teal-500/30 bg-black/50 shadow-md shadow-teal-500/10">
                            <img
                              src={m.avatarUrl || "/assets/DevEngine-emblem.png"}
                              alt={m.name}
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleMemberActive(m)}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-jetbrains uppercase tracking-wider font-bold cursor-pointer transition-colors ${
                                m.isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                  : "bg-gray-700/30 text-gray-400 border border-gray-600"
                              }`}
                            >
                              {m.isActive ? "ACTIVE" : "HIDDEN"}
                            </button>
                            <span className="text-xs font-jetbrains text-gray-500">
                              #{m.order || 1}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                            {m.name}
                          </h3>
                          <p className="text-xs font-jetbrains text-teal-400 tracking-wide mt-0.5">
                            {m.role}
                          </p>
                        </div>

                        <p className="text-gray-300 text-xs leading-relaxed line-clamp-3">
                          {m.bio}
                        </p>

                        {/* Skills */}
                        {m.skills && m.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {m.skills.slice(0, 4).map((skill, idx) => (
                              <span
                                key={idx}
                                className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-jetbrains text-gray-300"
                              >
                                {skill}
                              </span>
                            ))}
                            {m.skills.length > 4 && (
                              <span className="px-2 py-1 text-[10px] font-jetbrains text-gray-500">
                                +{m.skills.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06] mt-4">
                        <button
                          type="button"
                          onClick={() => openEditMemberModal(m)}
                          className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/20 text-gray-300 hover:text-white text-xs font-jetbrains flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                          <span>EDIT</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(m)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-jetbrains flex items-center gap-1.5 cursor-pointer transition-all"
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
        </div>
      </main>

      {/* Add / Edit Member Modal (Bounded Container to prevent scrollbar breaking corners) */}
      {memberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl max-h-[90vh] bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
            {/* Pinned Header */}
            <div className="px-6 sm:px-8 py-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div>
                <span className="font-jetbrains text-[10px] text-teal-400 uppercase tracking-widest font-bold">
                  TEAM DIRECTORY
                </span>
                <h3 className="text-xl font-bold text-white font-['Space_Grotesk'] mt-0.5">
                  {memberForm.id ? "Edit Team Member" : "Add Team Member / Hire"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMemberModalOpen(false)}
                className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveMember} id="memberFormElement" className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={memberForm.name}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, name: e.target.value })
                    }
                    placeholder="e.g., Alex Rivera"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Role / Position *
                  </label>
                  <input
                    type="text"
                    required
                    value={memberForm.role}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, role: e.target.value })
                    }
                    placeholder="e.g., Senior Flutter Architect"
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Avatar Uploader: Dual Option (Upload from Local PC or Image URL) */}
              <div className="space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-jetbrains text-gray-300 uppercase tracking-wider font-semibold">
                    Profile Avatar / Photo *
                  </label>
                  <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-white/[0.08]">
                    <button
                      type="button"
                      onClick={() => setAvatarTab("file")}
                      className={`px-3 py-1 rounded-lg font-jetbrains text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        avatarTab === "file"
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-black shadow-sm font-bold"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">upload_file</span>
                      <span>UPLOAD LOCAL</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarTab("url")}
                      className={`px-3 py-1 rounded-lg font-jetbrains text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        avatarTab === "url"
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-black shadow-sm font-bold"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[13px]">link</span>
                      <span>IMAGE LINK</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-1">
                  {/* Live Avatar Preview */}
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden border-2 border-teal-500/40 bg-black flex-shrink-0 shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                    {memberForm.avatarUrl ? (
                      <img
                        src={memberForm.avatarUrl}
                        alt="Avatar preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <span className="material-symbols-outlined text-2xl">person</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    {avatarTab === "file" ? (
                      <div>
                        <label className="relative flex flex-col items-center justify-center border border-dashed border-white/20 hover:border-teal-500/60 rounded-xl px-4 py-2.5 cursor-pointer bg-black/40 transition-colors group">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLocalFileUpload}
                            className="sr-only"
                            disabled={uploadingFile}
                          />
                          <div className="flex items-center gap-2 text-xs font-jetbrains text-gray-300 group-hover:text-white">
                            <span className="material-symbols-outlined text-[18px] text-teal-400">
                              {uploadingFile ? "hourglass_top" : "add_photo_alternate"}
                            </span>
                            <span>
                              {uploadingFile
                                ? "Uploading image to server…"
                                : "Choose file from your PC (PNG, JPG, WebP)"}
                            </span>
                          </div>
                        </label>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="text"
                          value={memberForm.avatarUrl}
                          onChange={(e) =>
                            setMemberForm({ ...memberForm, avatarUrl: e.target.value })
                          }
                          placeholder="https://... or /assets/member_name.png"
                          className="w-full h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                        />
                      </div>
                    )}

                    {/* Quick presets for existing assets */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-jetbrains text-gray-400">
                      <span>Quick presets:</span>
                      <button
                        type="button"
                        onClick={() =>
                          setMemberForm((prev) => ({
                            ...prev,
                            avatarUrl: "/assets/arina_huque_rafa.png",
                          }))
                        }
                        className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-teal-400 border border-white/[0.08] cursor-pointer transition-colors"
                      >
                        Arina
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMemberForm((prev) => ({
                            ...prev,
                            avatarUrl: "/assets/sabiha_jahan_mishu.png",
                          }))
                        }
                        className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-teal-400 border border-white/[0.08] cursor-pointer transition-colors"
                      >
                        Sabiha
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setMemberForm((prev) => ({
                            ...prev,
                            avatarUrl: "/assets/dhrubo_mandal.png",
                          }))
                        }
                        className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 hover:text-teal-400 border border-white/[0.08] cursor-pointer transition-colors"
                      >
                        Dhrubo
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                  Bio / Specialization
                </label>
                <textarea
                  rows={3}
                  value={memberForm.bio}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, bio: e.target.value })
                  }
                  placeholder="Describe engineering background, core focus areas, or project contributions..."
                  className="w-full bg-black/40 border border-white/[0.08] rounded-xl p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 resize-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                  Skills & Tech Stack (Comma-separated)
                </label>
                <input
                  type="text"
                  value={memberForm.skills}
                  onChange={(e) =>
                    setMemberForm({ ...memberForm, skills: e.target.value })
                  }
                  placeholder="Flutter, Riverpod, Dart, Firebase, Python"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    GitHub URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={memberForm.github}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, github: e.target.value })
                    }
                    placeholder="https://github.com/..."
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    LinkedIn URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={memberForm.linkedin}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, linkedin: e.target.value })
                    }
                    placeholder="https://linkedin.com/in/..."
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 mb-1.5 uppercase tracking-wider">
                    Display Order (1, 2, 3...)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={memberForm.order}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, order: Number(e.target.value) })
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] rounded-xl px-4 text-sm text-white focus:outline-none focus:border-teal-500/50 transition-colors"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="memberActiveCheck"
                    checked={memberForm.isActive}
                    onChange={(e) =>
                      setMemberForm({ ...memberForm, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded bg-black/40 border border-white/[0.12] text-teal-400 focus:ring-0 cursor-pointer"
                  />
                  <label
                    htmlFor="memberActiveCheck"
                    className="text-xs font-jetbrains text-gray-300 cursor-pointer select-none"
                  >
                    Publicly Visible on About Page
                  </label>
                </div>
              </div>
            </form>

            {/* Pinned Footer */}
            <div className="px-6 sm:px-8 py-4 border-t border-white/[0.08] flex items-center justify-end gap-3 shrink-0 bg-white/[0.02]">
              <button
                type="button"
                onClick={() => setMemberModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-jetbrains text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="submit"
                form="memberFormElement"
                disabled={savingMember}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-black font-jetbrains text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-lg shadow-teal-500/20 cursor-pointer"
              >
                {savingMember ? "SAVING…" : "SAVE MEMBER"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recycle Bin Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0c0c16]/98 border border-white/[0.08] rounded-3xl p-6 sm:p-7 space-y-5 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <span className="material-symbols-outlined text-[24px]">delete</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Move to Recycle Bin?
                </h3>
                <p className="text-xs font-jetbrains text-gray-400">
                  Item will be retained for 30 days before permanent purging.
                </p>
              </div>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">
              Are you sure you want to move{" "}
              <span className="text-white font-semibold">{deleteTarget.name}</span>{" "}
              ({deleteTarget.role}) to the Recycle Bin?
            </p>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed font-jetbrains">
              💡 You can restore this team member anytime from <strong>Dashboard &gt; Recycle Bin</strong>.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deletingMember}
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-jetbrains text-gray-400 hover:text-white hover:bg-white/[0.05] transition-colors cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={deletingMember}
                onClick={confirmMoveMemberToBin}
                className="px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-jetbrains font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-rose-500/20"
              >
                {deletingMember ? "MOVING..." : "MOVE TO RECYCLE BIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
