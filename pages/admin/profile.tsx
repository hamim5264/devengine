import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import { onAdminPageAccess } from "@/lib/services/staffAuth";
import { useAdminProfile, saveAdminProfile, type AdminProfile } from "@/lib/services/adminProfileService";
import { uploadStorageAsset } from "@/lib/services/storageAssetService";
import { EmployeeDialog } from "@/components/staff/EmployeeUI";
import s from "@/components/admin/AdminWorkspace.module.css";

export default function AdminProfilePage() {
  const router = useRouter(); const saved = useAdminProfile();
  const [profile, setProfile] = useState<AdminProfile>(saved);
  const [ready, setReady] = useState(false); const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false); const [error, setError] = useState(""); const [success, setSuccess] = useState(false);
  const [dirty, setDirty] = useState(false); const [broken, setBroken] = useState(false);
  useEffect(() => onAdminPageAccess(router, () => setReady(true)), [router]);
  useEffect(() => { if (!dirty) setProfile(saved); }, [saved, dirty]);
  function change(key: keyof AdminProfile, value: string) { setDirty(true); setProfile(current => ({ ...current, [key]: value })); if (key === "avatarUrl") setBroken(false); }
  async function upload(file?: File) {
    if (!file) return;
    setUploading(true); setError("");
    try { if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPG or WebP image."); change("avatarUrl", await uploadStorageAsset(file, "admin-profile", "avatar", 10 * 1024 * 1024)); }
    catch (error) { setError(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setUploading(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await saveAdminProfile(profile); setDirty(false); setSuccess(true); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not save your profile."); }
    finally { setBusy(false); }
  }
  return <AdminLayout title="My Profile | DevEngine"><div className={s.page}>
    <div className={s.header}><div><p className={s.eyebrow}>Your studio identity</p><h1>My profile.</h1><p>Your name and photo appear in conversations, the team directory and administrator console.</p></div></div>
    {error && <div role="alert" className={s.notice} data-error>{error}</div>}
    {ready ? <form onSubmit={save} className={s.profile}>
      <aside className={`${s.panel} ${s.avatarPanel}`}><div className={s.avatar}>{profile.avatarUrl && !broken ? <img src={profile.avatarUrl} alt="Profile preview" onError={() => setBroken(true)} /> : <span className="material-symbols-outlined">person</span>}</div><h2>{profile.name || "Administrator"}</h2><p>{profile.title}</p><label className={s.button}>{uploading ? "Uploading…" : "Upload photo"}<input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy || uploading} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ""; }} /></label><button type="button" className={s.button} disabled={busy || uploading} onClick={() => change("avatarUrl", "")}>Remove photo</button><p>JPG, PNG or WebP · up to 10 MB</p></aside>
      <section className={s.panel}><h2>Profile details</h2><div className={s.grid}><label className={s.field}>Full name<input required maxLength={100} value={profile.name} onChange={event => change("name", event.target.value)} /></label><label className={s.field}>Title<input maxLength={100} placeholder="Administrator" value={profile.title} onChange={event => change("title", event.target.value)} /></label><label className={`${s.field} ${s.full}`}>Account email<input readOnly value={auth.currentUser?.email || ""} /><small>Your sign-in email stays linked to your account.</small></label><label className={`${s.field} ${s.full}`}>Image link<input type="url" placeholder="https://…" value={profile.avatarUrl.startsWith("/assets/") ? "" : profile.avatarUrl} onChange={event => change("avatarUrl", event.target.value)} /></label><label className={`${s.field} ${s.full}`}>About you<textarea maxLength={1000} placeholder="A short introduction" value={profile.bio} onChange={event => change("bio", event.target.value)} /></label></div><div className={s.actions} style={{ marginTop: 24 }}><button type="submit" className={s.primary} disabled={busy || uploading || !dirty}>{busy ? "Saving…" : "Save profile"}</button></div></section>
    </form> : <p role="status">Loading profile…</p>}
    {success && <EmployeeDialog title="Profile updated" icon="task_alt" onClose={() => setSuccess(false)}><p>Your profile has been saved and updated in the team directory.</p><div className={s.actions}><button className={s.primary} onClick={() => setSuccess(false)}>Done</button></div></EmployeeDialog>}
  </div></AdminLayout>;
}
