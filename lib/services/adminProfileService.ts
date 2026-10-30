import { doc, getDoc, onSnapshot, writeBatch } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";

export interface AdminProfile { name: string; title: string; avatarUrl: string; bio: string; }
export const DEFAULT_ADMIN_PROFILE: AdminProfile = { name: "Hamim Leon", title: "Administrator", avatarUrl: "/assets/CEO.png", bio: "" };
const profileRef = () => doc(db, "app_settings", "admin_profile");
export function useAdminProfile() {
  const [profile, setProfile] = useState<AdminProfile>(DEFAULT_ADMIN_PROFILE);
  useEffect(() => onSnapshot(profileRef(), snap => {
    if (snap.exists()) {
      const value = snap.data();
      setProfile({ name: value.name || DEFAULT_ADMIN_PROFILE.name, title: value.title || "Administrator", avatarUrl: value.avatarUrl || "", bio: value.bio || "" });
    }
  }, () => {}), []);
  return profile;
}
export async function saveAdminProfile(input: AdminProfile) {
  const user = auth.currentUser;
  if (!user || user.email !== (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com")) throw new Error("Administrator access is required.");
  const name = input.name.trim().slice(0, 100);
  if (!name) throw new Error("Enter your name.");
  const avatarUrl = input.avatarUrl.trim();
  if (avatarUrl && !avatarUrl.startsWith("/assets/") && !/^https:\/\//i.test(avatarUrl)) throw new Error("Use an HTTPS image link.");
  const profile = { name, title: input.title.trim().slice(0, 100) || "Administrator", avatarUrl, bio: input.bio.trim().slice(0, 1000) };
  const personRef = doc(db, "studio_people", user.uid);
  const person = await getDoc(personRef);
  const batch = writeBatch(db);
  batch.set(profileRef(), profile);
  batch.set(personRef, { uid: user.uid, name, avatarUrl, role: "admin", status: "active", departmentIds: person.data()?.departmentIds || [], chatSuspended: false });
  await batch.commit();
  return profile;
}
