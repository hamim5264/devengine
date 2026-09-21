import React, { useEffect, useState } from "react";
import Head from "next/head";
import AdminLayout from "@/components/AdminLayout";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import HelixLoader from "@/components/HelixLoader";
import { SocialLink } from "@/types/social";
import {
  getAllSocialLinksAdmin,
  createSocialLink,
  updateSocialLink,
  deleteSocialLink,
  seedInitialSocialLinks,
  INITIAL_SOCIAL_LINKS,
} from "@/lib/services/socialService";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

interface SocialFormState {
  id?: string;
  platform: string;
  url: string;
  icon: string;
  order: number;
  isActive: boolean;
}

const EMPTY_FORM: SocialFormState = {
  platform: "",
  url: "",
  icon: "link",
  order: 1,
  isActive: true,
};

const SUGGESTED_PLATFORMS = [
  { name: "GitHub", icon: "code", defaultUrl: "https://github.com/" },
  { name: "LinkedIn", icon: "work", defaultUrl: "https://www.linkedin.com/in/" },
  { name: "Facebook", icon: "groups", defaultUrl: "https://www.facebook.com/" },
  { name: "YouTube", icon: "smart_display", defaultUrl: "https://www.youtube.com/" },
  { name: "Twitter / X", icon: "alternate_email", defaultUrl: "https://x.com/" },
  { name: "Instagram", icon: "photo_camera", defaultUrl: "https://instagram.com/" },
  { name: "Discord", icon: "chat", defaultUrl: "https://discord.gg/" },
  { name: "Telegram", icon: "send", defaultUrl: "https://t.me/" },
  { name: "Dribbble", icon: "palette", defaultUrl: "https://dribbble.com/" },
  { name: "Medium", icon: "article", defaultUrl: "https://medium.com/" },
];

export default function ManageSocialsPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Social Links State
  const [links, setLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<SocialFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SocialLink | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState("");

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

  // Fetch all social links
  const loadLinks = async () => {
    try {
      setLoading(true);
      const data = await getAllSocialLinksAdmin();
      setLinks(data);
    } catch (err) {
      console.error("Error loading social links:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadLinks();
    }
  }, [isAdmin]);

  // Modal open handlers
  const openAddModal = () => {
    setForm({
      ...EMPTY_FORM,
      order: links.length + 1,
    });
    setModalOpen(true);
  };

  const openEditModal = (link: SocialLink) => {
    setForm({
      id: link.id,
      platform: link.platform,
      url: link.url,
      icon: link.icon || "link",
      order: link.order || 1,
      isActive: link.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSelectSuggestedPlatform = (platform: typeof SUGGESTED_PLATFORMS[0]) => {
    setForm((prev) => ({
      ...prev,
      platform: platform.name,
      icon: platform.icon,
      url: prev.url || platform.defaultUrl,
    }));
  };

  // Save Link (Create or Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.platform.trim() || !form.url.trim()) {
      alert("Platform name and URL are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        platform: form.platform.trim(),
        url: form.url.trim(),
        icon: form.icon.trim() || "link",
        order: Number(form.order) || 1,
        isActive: form.isActive,
      };

      if (form.id) {
        await updateSocialLink(form.id, payload);
      } else {
        await createSocialLink(payload);
      }

      await loadLinks();
      setModalOpen(false);
      setNotice(form.id ? "Social link updated successfully!" : "Social link created successfully!");
      setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      console.error("Error saving social link:", err);
      alert("Failed to save social link. Please check console.");
    } finally {
      setSaving(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (link: SocialLink) => {
    const nextActive = !link.isActive;
    try {
      setLinks((prev) =>
        prev.map((item) =>
          item.id === link.id ? { ...item, isActive: nextActive } : item
        )
      );
      await updateSocialLink(link.id, { isActive: nextActive });
    } catch (err) {
      console.error("Error toggling active state:", err);
      alert("Failed to update status.");
      await loadLinks();
    }
  };

  // Delete Link
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const targetId = deleteTarget.id;
      setLinks((prev) => prev.filter((item) => item.id !== targetId));
      setDeleteTarget(null);
      await deleteSocialLink(targetId);
      setNotice("Social link deleted.");
      setTimeout(() => setNotice(""), 4000);
    } catch (err) {
      console.error("Error deleting social link:", err);
      alert("Failed to delete social link.");
      await loadLinks();
    }
  };

  // Seed default 4 social links
  const handleSeedDefaults = async () => {
    if (
      !confirm(
        "This will initialize or update the database with the 4 default DevEngine social channels (GitHub, LinkedIn, Facebook, YouTube). Continue?"
      )
    ) {
      return;
    }

    setSeeding(true);
    try {
      await seedInitialSocialLinks();
      await loadLinks();
      setNotice("Default DevEngine social links synced successfully!");
      setTimeout(() => setNotice(""), 5000);
    } catch (err) {
      console.error("Seed error:", err);
      alert("Failed to seed social links.");
    } finally {
      setSeeding(false);
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

  const activeCount = links.filter((l) => l.isActive !== false).length;
  const hiddenCount = links.length - activeCount;

  return (
    <AdminLayout>
      <Head>
        <title>Manage Follow Us & Socials | DevEngine Admin</title>
      </Head>
        <main className="px-4 sm:px-6 lg:px-8 py-8 min-h-[calc(100vh-56px)] text-gray-100">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/dashboard"
                  className="text-gray-400 hover:text-[#3EF3FF] font-jetbrains text-xs tracking-wider transition-colors"
                >
                  ← DASHBOARD
                </Link>
                <span className="text-gray-600">/</span>
                <span className="text-[#3EF3FF] font-jetbrains text-xs tracking-widest uppercase font-semibold">
                  FOOTER SYSTEM & CHANNELS
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
                Follow Us & Social Channels CMS
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Manage social channels displayed in the &quot;FOLLOW US&quot; footer column. Add, edit, reorder, or toggle links.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="px-4 py-2.5 rounded-xl border border-[#3EF3FF]/30 text-[#3EF3FF] hover:bg-[#3EF3FF]/10 text-xs font-jetbrains font-semibold tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                title="Seeds GitHub, LinkedIn, Facebook, and YouTube"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                <span>{seeding ? "SYNCING…" : "SYNC DEFAULT SOCIALS"}</span>
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="px-5 py-2.5 rounded-xl bg-[#3EF3FF] hover:bg-[#78F5FF] text-black text-xs font-jetbrains font-bold uppercase tracking-wider transition-all shadow-lg shadow-[#3EF3FF]/20 flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                <span>ADD SOCIAL CHANNEL</span>
              </button>
            </div>
          </div>

          {/* Flash Notice */}
          {notice && (
            <div className="bg-[#3EF3FF]/10 border border-[#3EF3FF]/30 text-[#3EF3FF] px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-jetbrains">
              <span className="material-symbols-outlined text-[20px]">verified</span>
              <span>{notice}</span>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-jetbrains text-gray-400 uppercase tracking-wider">
                  Total Channels
                </span>
                <span className="material-symbols-outlined text-[#3EF3FF] text-[20px]">
                  share
                </span>
              </div>
              <p className="text-3xl font-extrabold text-white mt-2 font-['Space_Grotesk']">
                {links.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">Configured in database</p>
            </div>

            <div className="bg-white/[0.02] border border-emerald-500/20 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-jetbrains text-emerald-400 uppercase tracking-wider">
                  Active in Footer
                </span>
                <span className="material-symbols-outlined text-emerald-400 text-[20px]">
                  visibility
                </span>
              </div>
              <p className="text-3xl font-extrabold text-emerald-300 mt-2 font-['Space_Grotesk']">
                {activeCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Currently visible to visitors</p>
            </div>

            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-jetbrains text-gray-400 uppercase tracking-wider">
                  Hidden / Inactive
                </span>
                <span className="material-symbols-outlined text-gray-400 text-[20px]">
                  visibility_off
                </span>
              </div>
              <p className="text-3xl font-extrabold text-gray-300 mt-2 font-['Space_Grotesk']">
                {hiddenCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Draft or disabled links</p>
            </div>
          </div>

          {/* Channels Grid / Table */}
          <div className="bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden">
            <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white font-['Space_Grotesk']">
                  Footer &quot;FOLLOW US&quot; Directory
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Links appear in the order defined below (ascending order number).
                </p>
              </div>

              <Link
                href="/home"
                target="_blank"
                className="text-xs font-jetbrains text-[#3EF3FF] hover:underline flex items-center gap-1.5"
              >
                <span>Preview Landing Footer</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </Link>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                <HelixLoader size={40} color="#3EF3FF" />
                <p className="mt-4 font-jetbrains text-xs">Loading social channels…</p>
              </div>
            ) : links.length === 0 ? (
              <div className="py-20 text-center text-gray-400 space-y-4">
                <span className="material-symbols-outlined text-5xl text-gray-600">
                  share_off
                </span>
                <p className="text-sm">No social channels found in database.</p>
                <button
                  type="button"
                  onClick={handleSeedDefaults}
                  className="px-4 py-2 rounded-xl bg-[#3EF3FF] text-black text-xs font-jetbrains font-bold uppercase tracking-wider"
                >
                  Sync Default 4 Socials
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Priority / Order badge */}
                      <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-jetbrains text-xs flex items-center justify-center font-bold shrink-0">
                        #{link.order || 1}
                      </span>

                      {/* Icon avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-[#080E1A] border border-white/10 flex items-center justify-center text-[#3EF3FF] shrink-0 shadow-inner">
                        <span className="material-symbols-outlined text-[24px]">
                          {link.icon || "share"}
                        </span>
                      </div>

                      {/* Platform & URL */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <h3 className="text-base font-bold text-white font-['Space_Grotesk'] truncate">
                            {link.platform}
                          </h3>
                          {link.isActive !== false ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-jetbrains font-bold border border-emerald-500/30">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-gray-500/10 text-gray-400 text-[10px] font-jetbrains font-bold border border-gray-500/30">
                              HIDDEN
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-mono text-gray-400 truncate mt-0.5 max-w-md sm:max-w-xl">
                          {link.url}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      {/* External preview link */}
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs transition-all"
                        title="Open external link"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          open_in_new
                        </span>
                      </a>

                      {/* Toggle status */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(link)}
                        className={`px-3 py-2 rounded-xl text-xs font-jetbrains font-bold tracking-wider transition-all border cursor-pointer ${
                          link.isActive !== false
                            ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-gray-500/10 text-gray-400 border-gray-500/30 hover:bg-gray-500/20"
                        }`}
                      >
                        {link.isActive !== false ? "HIDE" : "SHOW"}
                      </button>

                      {/* Edit */}
                      <button
                        type="button"
                        onClick={() => openEditModal(link)}
                        className="px-4 py-2 rounded-xl bg-[#3EF3FF]/10 hover:bg-[#3EF3FF]/20 text-[#3EF3FF] border border-[#3EF3FF]/30 text-xs font-jetbrains font-bold uppercase tracking-wider transition-all cursor-pointer"
                      >
                        EDIT
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(link)}
                        className="p-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-all cursor-pointer"
                        title="Delete channel"
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          delete
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add / Edit Social Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
          <div className="w-full max-w-xl bg-[#080E1A] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-xl font-bold text-white font-['Space_Grotesk']">
                {form.id ? "Edit Social Channel" : "Add New Social Channel"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Quick preset chips */}
            <div>
              <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-2">
                Quick Presets (Click to Fill)
              </label>
              <div className="flex flex-wrap gap-2">
                {SUGGESTED_PLATFORMS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSelectSuggestedPlatform(preset)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-[#3EF3FF]/10 hover:border-[#3EF3FF]/40 border border-white/10 text-xs font-jetbrains text-gray-300 hover:text-[#3EF3FF] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {preset.icon}
                    </span>
                    <span>{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                    Platform Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. GitHub, LinkedIn, YouTube"
                    value={form.platform}
                    onChange={(e) =>
                      setForm({ ...form, platform: e.target.value })
                    }
                    className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3EF3FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                    Display Order (Priority)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.order}
                    onChange={(e) =>
                      setForm({ ...form, order: Number(e.target.value) })
                    }
                    className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3EF3FF]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                  Target Destination URL *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={form.url}
                  onChange={(e) =>
                    setForm({ ...form, url: e.target.value })
                  }
                  className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3EF3FF] font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-jetbrains text-gray-400 uppercase tracking-wider mb-1.5">
                    Icon Identifier
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="code, work, groups, smart_display"
                      value={form.icon}
                      onChange={(e) =>
                        setForm({ ...form, icon: e.target.value })
                      }
                      className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3EF3FF]"
                    />
                    <div className="w-11 h-11 rounded-xl bg-[#030712] border border-white/10 flex items-center justify-center text-[#3EF3FF] shrink-0">
                      <span className="material-symbols-outlined text-[22px]">
                        {form.icon || "share"}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-500 font-jetbrains mt-1 block">
                    Google Material Symbols icon name
                  </span>
                </div>

                <div className="flex flex-col justify-center pt-2">
                  <div className="flex items-center gap-3 bg-[#030712] border border-white/10 rounded-xl p-3">
                    <input
                      type="checkbox"
                      id="socialActiveCheck"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                      className="w-4 h-4 rounded bg-[#02040A] border-white/20 text-[#3EF3FF] focus:ring-0 cursor-pointer"
                    />
                    <label
                      htmlFor="socialActiveCheck"
                      className="text-xs font-jetbrains text-white cursor-pointer select-none"
                    >
                      Active on Public Footer
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-jetbrains text-gray-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-[#3EF3FF] hover:bg-[#78F5FF] text-black font-jetbrains text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-md shadow-[#3EF3FF]/20"
                >
                  {saving ? "SAVING…" : "SAVE SOCIAL CHANNEL"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#080E1A] border border-red-500/30 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white font-['Space_Grotesk']">
              Delete Social Channel?
            </h3>
            <p className="text-gray-400 text-sm">
              Are you sure you want to remove{" "}
              <span className="text-white font-semibold">
                {deleteTarget.platform}
              </span>{" "}
              ({deleteTarget.url}) from the footer &quot;FOLLOW US&quot; section?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-jetbrains text-gray-400 hover:text-white"
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-5 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-jetbrains font-bold tracking-wider transition-all"
              >
                DELETE
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
