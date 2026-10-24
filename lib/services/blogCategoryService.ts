import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  BlogCategoryItem,
  DefaultBlogCategory,
  BLOG_CATEGORY_CONFIG,
  BlogPost,
} from "@/types/blog";

const COLLECTION_NAME = "blog_categories";

export const DEFAULT_BLOG_CATEGORIES: BlogCategoryItem[] = [
  {
    id: "SUCCESS_STORY",
    label: "Success Story",
    icon: "trending_up",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-400",
    badgeBorder: "border-emerald-500/30",
    glowColor: "rgba(16, 185, 129, 0.4)",
    colorTheme: "emerald",
    isCustom: false,
  },
  {
    id: "ACHIEVEMENT",
    label: "Milestone & Achievement",
    icon: "military_tech",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/30",
    glowColor: "rgba(245, 158, 11, 0.4)",
    colorTheme: "amber",
    isCustom: false,
  },
  {
    id: "FAILURE_LESSON",
    label: "Failure & Hard Lessons",
    icon: "warning",
    badgeBg: "bg-rose-500/15",
    badgeText: "text-rose-400",
    badgeBorder: "border-rose-500/30",
    glowColor: "rgba(244, 63, 94, 0.4)",
    colorTheme: "rose",
    isCustom: false,
  },
  {
    id: "ENGINEERING",
    label: "Engineering Deep Dive",
    icon: "terminal",
    badgeBg: "bg-[#2cecf7]/15",
    badgeText: "text-[#2cecf7]",
    badgeBorder: "border-[#2cecf7]/30",
    glowColor: "rgba(44, 236, 247, 0.4)",
    colorTheme: "cyan",
    isCustom: false,
  },
  {
    id: "STUDIO_CULTURE",
    label: "Studio Philosophy",
    icon: "psychology",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-300",
    badgeBorder: "border-purple-500/30",
    glowColor: "rgba(168, 85, 247, 0.4)",
    colorTheme: "purple",
    isCustom: false,
  },
];

export const CATEGORY_COLOR_PRESETS: Record<
  string,
  { label: string; bg: string; text: string; border: string; glow: string; colorCode: string }
> = {
  cyan: {
    label: "DevEngine Cyan (#2cecf7)",
    bg: "bg-[#2cecf7]/15",
    text: "text-[#2cecf7]",
    border: "border-[#2cecf7]/30",
    glow: "rgba(44, 236, 247, 0.4)",
    colorCode: "#2cecf7",
  },
  emerald: {
    label: "Emerald Green",
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    glow: "rgba(16, 185, 129, 0.4)",
    colorCode: "#10b981",
  },
  amber: {
    label: "Amber Gold",
    bg: "bg-amber-500/15",
    text: "text-amber-300",
    border: "border-amber-500/30",
    glow: "rgba(245, 158, 11, 0.4)",
    colorCode: "#f59e0b",
  },
  purple: {
    label: "Purple Violet",
    bg: "bg-purple-500/15",
    text: "text-purple-300",
    border: "border-purple-500/30",
    glow: "rgba(168, 85, 247, 0.4)",
    colorCode: "#a855f7",
  },
  rose: {
    label: "Rose Crimson",
    bg: "bg-rose-500/15",
    text: "text-rose-400",
    border: "border-rose-500/30",
    glow: "rgba(244, 63, 94, 0.4)",
    colorCode: "#f43f5e",
  },
  sky: {
    label: "Sky Blue",
    bg: "bg-sky-500/15",
    text: "text-sky-300",
    border: "border-sky-500/30",
    glow: "rgba(14, 165, 233, 0.4)",
    colorCode: "#0ea5e9",
  },
  pink: {
    label: "Neon Pink",
    bg: "bg-pink-500/15",
    text: "text-pink-300",
    border: "border-pink-500/30",
    glow: "rgba(236, 72, 153, 0.4)",
    colorCode: "#ec4899",
  },
  teal: {
    label: "Deep Teal",
    bg: "bg-teal-500/15",
    text: "text-teal-300",
    border: "border-teal-500/30",
    glow: "rgba(20, 184, 166, 0.4)",
    colorCode: "#14b8a6",
  },
};

/**
 * Fetch custom blog categories from Firestore
 */
export async function getCustomBlogCategories(): Promise<BlogCategoryItem[]> {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy("label", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<BlogCategoryItem, "id">),
      isCustom: true,
    }));
  } catch (error) {
    console.error("Failed to fetch custom blog categories from Firestore:", error);
    return [];
  }
}

/**
 * Save or update a custom blog category in Firestore
 */
export async function saveCustomBlogCategory(category: BlogCategoryItem): Promise<void> {
  const cleanId = category.id
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "_");
  
  if (!cleanId) throw new Error("Category ID cannot be empty");

  const colorPreset = CATEGORY_COLOR_PRESETS[category.colorTheme || "cyan"] || CATEGORY_COLOR_PRESETS.cyan;

  const data: Omit<BlogCategoryItem, "id"> = {
    label: category.label.trim(),
    icon: category.icon || "label",
    colorTheme: category.colorTheme || "cyan",
    badgeBg: category.badgeBg || colorPreset.bg,
    badgeText: category.badgeText || colorPreset.text,
    badgeBorder: category.badgeBorder || colorPreset.border,
    glowColor: category.glowColor || colorPreset.glow,
    isCustom: true,
    createdAt: category.createdAt || new Date().toISOString(),
  };

  const docRef = doc(db, COLLECTION_NAME, cleanId);
  await setDoc(docRef, data, { merge: true });
}

/**
 * Delete a custom blog category from Firestore
 */
export async function deleteCustomBlogCategory(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Merge default categories + custom Firestore categories + any unseen categories from posts
 */
export function getAllBlogCategories(
  customs: BlogCategoryItem[] = [],
  posts: BlogPost[] = []
): BlogCategoryItem[] {
  const list: BlogCategoryItem[] = [...DEFAULT_BLOG_CATEGORIES];
  const seenIds = new Set<string>(DEFAULT_BLOG_CATEGORIES.map((c) => c.id.toLowerCase()));

  // Add custom categories
  for (const c of customs) {
    const key = c.id.toLowerCase();
    if (!seenIds.has(key)) {
      seenIds.add(key);
      list.push(c);
    }
  }

  // Add any legacy / unique categories present in posts that aren't registered yet
  for (const post of posts) {
    if (post.category) {
      const key = String(post.category).toLowerCase();
      if (!seenIds.has(key)) {
        seenIds.add(key);
        const cleanLabel = String(post.category)
          .replace(/[_-]+/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

        list.push({
          id: String(post.category),
          label: cleanLabel,
          icon: "label",
          badgeBg: "bg-[#2cecf7]/15",
          badgeText: "text-[#2cecf7]",
          badgeBorder: "border-[#2cecf7]/30",
          glowColor: "rgba(44, 236, 247, 0.4)",
          colorTheme: "cyan",
          isCustom: true,
        });
      }
    }
  }

  return list;
}
