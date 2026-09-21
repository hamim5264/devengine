import {
  collection,
  doc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SocialLink } from "@/types/social";

const SOCIAL_COLLECTION = "footer_socials";

export const INITIAL_SOCIAL_LINKS: SocialLink[] = [
  {
    id: "github",
    platform: "GitHub",
    url: "https://github.com/DevEngine-Build-Fast-Learn-Smart",
    icon: "code",
    order: 1,
    isActive: true,
  },
  {
    id: "linkedin",
    platform: "LinkedIn",
    url: "https://www.linkedin.com/in/abdul-hamim-a35b02253/",
    icon: "work",
    order: 2,
    isActive: true,
  },
  {
    id: "facebook",
    platform: "Facebook",
    url: "https://www.facebook.com/profile.php?id=61575608701014",
    icon: "groups",
    order: 3,
    isActive: true,
  },
  {
    id: "youtube",
    platform: "YouTube",
    url: "https://www.youtube.com/@TheDevHamim",
    icon: "smart_display",
    order: 4,
    isActive: true,
  },
];

/**
 * Fetch all active social links for public footer
 */
export async function getSocialLinks(): Promise<SocialLink[]> {
  try {
    const colRef = collection(db, SOCIAL_COLLECTION);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      return INITIAL_SOCIAL_LINKS;
    }

    const items: SocialLink[] = [];
    snap.forEach((d) => {
      const data = d.data() as SocialLink;
      if (data.isActive !== false) {
        items.push({ ...data, id: d.id });
      }
    });

    items.sort((a, b) => (a.order || 99) - (b.order || 99));
    return items.length > 0 ? items : INITIAL_SOCIAL_LINKS;
  } catch (err) {
    console.error("Error fetching social links, using fallback:", err);
    return INITIAL_SOCIAL_LINKS;
  }
}

/**
 * Fetch all social links for Admin CMS
 */
export async function getAllSocialLinksAdmin(): Promise<SocialLink[]> {
  try {
    const colRef = collection(db, SOCIAL_COLLECTION);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      return INITIAL_SOCIAL_LINKS;
    }

    const items: SocialLink[] = [];
    snap.forEach((d) => {
      items.push({ ...(d.data() as SocialLink), id: d.id });
    });

    items.sort((a, b) => (a.order || 99) - (b.order || 99));
    return items;
  } catch (err) {
    console.error("Error fetching admin social links:", err);
    return INITIAL_SOCIAL_LINKS;
  }
}

/**
 * Seed initial 4 social links into Firestore
 */
export async function seedInitialSocialLinks(): Promise<number> {
  let count = 0;
  for (const item of INITIAL_SOCIAL_LINKS) {
    const docRef = doc(db, SOCIAL_COLLECTION, item.id);
    await setDoc(docRef, item, { merge: true });
    count++;
  }
  return count;
}

/**
 * Create a new social link
 */
export async function createSocialLink(
  data: Omit<SocialLink, "id">
): Promise<string> {
  const colRef = collection(db, SOCIAL_COLLECTION);
  const now = new Date().toISOString();
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

/**
 * Update an existing social link
 */
export async function updateSocialLink(
  id: string,
  data: Partial<SocialLink>
): Promise<void> {
  const docRef = doc(db, SOCIAL_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a social link
 */
export async function deleteSocialLink(id: string): Promise<void> {
  const docRef = doc(db, SOCIAL_COLLECTION, id);
  await deleteDoc(docRef);
}
