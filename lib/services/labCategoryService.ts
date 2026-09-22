import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";

export const LAB_CATEGORIES_COLLECTION = "lab_categories";
const LOCAL_STORAGE_KEY = "devengine_lab_categories_cache";

export interface LabCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  order?: number;
  createdAt?: any;
  updatedAt?: any;
}

export const DEFAULT_LAB_CATEGORIES: LabCategory[] = [
  {
    id: "mobile-app",
    name: "Mobile App",
    slug: "mobile-app",
    description: "iOS & Android mobile native or cross-platform applications",
    icon: "smartphone",
    order: 1,
  },
  {
    id: "web-platform",
    name: "Web Platform",
    slug: "web-platform",
    description: "Full-stack web apps, enterprise dashboards & cloud portals",
    icon: "language",
    order: 2,
  },
  {
    id: "ai-engine",
    name: "AI Engine",
    slug: "ai-engine",
    description: "Machine learning models, LLM agents & generative intelligence",
    icon: "psychology",
    order: 3,
  },
  {
    id: "cloud-service",
    name: "Cloud Service",
    slug: "cloud-service",
    description: "Distributed backend microservices, serverless APIs & data streams",
    icon: "cloud",
    order: 4,
  },
  {
    id: "desktop-app",
    name: "Desktop App",
    slug: "desktop-app",
    description: "High-performance macOS, Windows & Linux native tools",
    icon: "desktop_windows",
    order: 5,
  },
  {
    id: "iot-system",
    name: "IoT System",
    slug: "iot-system",
    description: "Embedded hardware firmware, sensor networks & edge computing",
    icon: "devices",
    order: 6,
  },
];

export const makeSlug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export function getCachedCategories(): LabCategory[] {
  if (typeof window === "undefined") return DEFAULT_LAB_CATEGORIES;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_LAB_CATEGORIES;
}

export function saveCachedCategories(cats: LabCategory[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cats));
  } catch (e) {
    // ignore
  }
}

/**
 * Seed default categories if the collection is empty.
 */
export async function seedDefaultLabCategories(): Promise<void> {
  try {
    const colRef = collection(db, LAB_CATEGORIES_COLLECTION);
    const snap = await getDocs(colRef);
    if (!snap.empty) return;

    for (const cat of DEFAULT_LAB_CATEGORIES) {
      await setDoc(doc(db, LAB_CATEGORIES_COLLECTION, cat.id), {
        ...cat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    console.warn("Firestore seed warning (using local defaults):", err);
    saveCachedCategories(DEFAULT_LAB_CATEGORIES);
  }
}

/**
 * Fetch all categories once.
 */
export async function getLabCategories(): Promise<LabCategory[]> {
  try {
    const colRef = collection(db, LAB_CATEGORIES_COLLECTION);
    const snap = await getDocs(colRef);
    if (snap.empty) {
      seedDefaultLabCategories().catch(console.warn);
      return getCachedCategories();
    }

    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as LabCategory[];

    list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
    saveCachedCategories(list);
    return list;
  } catch (err) {
    console.warn("Error fetching lab categories from Firestore (using cache):", err);
    return getCachedCategories();
  }
}

/**
 * Real-time listener for categories with resilient local cache fallback.
 */
export function subscribeLabCategories(
  callback: (cats: LabCategory[]) => void,
  onError?: (err: any) => void
) {
  // Immediately provide cached categories to eliminate any flash or wait
  const initial = getCachedCategories();
  callback(initial);

  try {
    const colRef = collection(db, LAB_CATEGORIES_COLLECTION);
    return onSnapshot(
      colRef,
      (snap) => {
        if (snap.empty) {
          seedDefaultLabCategories().catch(console.warn);
          callback(getCachedCategories());
          return;
        }

        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as LabCategory[];

        list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
        saveCachedCategories(list);
        callback(list);
      },
      (err) => {
        console.warn("Lab categories Firestore listener notice (using local cache):", err);
        // Ensure cached categories remain available
        callback(getCachedCategories());
        if (onError) onError(err);
      }
    );
  } catch (err) {
    console.warn("Failed to attach Firestore listener (using local cache):", err);
    callback(getCachedCategories());
    return () => {};
  }
}

/**
 * Create a new category with optimistic cache update & Firestore sync.
 */
export async function createLabCategory(data: {
  name: string;
  slug?: string;
  description?: string;
  icon?: string;
  order?: number;
}): Promise<string> {
  const name = data.name.trim();
  if (!name) throw new Error("Category name is required.");

  const slug = (data.slug?.trim() || makeSlug(name)) || "category";

  const payload: LabCategory = {
    id: slug,
    name,
    slug,
    description: data.description?.trim() || "",
    icon: data.icon?.trim() || "category",
    order: typeof data.order === "number" ? data.order : 50,
  };

  // 1. Update local cache immediately
  const current = getCachedCategories();
  const filtered = current.filter((c) => c.id !== slug);
  const updatedList = [...filtered, payload];
  updatedList.sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || a.name.localeCompare(b.name));
  saveCachedCategories(updatedList);

  // 2. Sync to Firestore in parallel
  try {
    const ref = doc(db, LAB_CATEGORIES_COLLECTION, slug);
    await setDoc(ref, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (firestoreErr) {
    console.warn("Firestore sync notice (saved to local cache):", firestoreErr);
  }

  return slug;
}

/**
 * Update an existing category.
 */
export async function updateLabCategory(
  id: string,
  data: Partial<Pick<LabCategory, "name" | "description" | "icon" | "order">>
): Promise<void> {
  // 1. Update local cache
  const current = getCachedCategories();
  const updatedList = current.map((c) => {
    if (c.id === id) {
      return {
        ...c,
        ...data,
      };
    }
    return c;
  });
  saveCachedCategories(updatedList);

  // 2. Sync to Firestore
  try {
    const ref = doc(db, LAB_CATEGORIES_COLLECTION, id);
    const payload: any = {
      ...data,
      updatedAt: serverTimestamp(),
    };
    if (payload.name) payload.name = payload.name.trim();
    if (payload.description !== undefined) payload.description = payload.description.trim();
    if (payload.icon) payload.icon = payload.icon.trim();

    await updateDoc(ref, payload);
  } catch (firestoreErr) {
    console.warn("Firestore sync notice (updated in local cache):", firestoreErr);
  }
}

/**
 * Delete a category.
 */
export async function deleteLabCategory(id: string): Promise<void> {
  // 1. Update local cache
  const current = getCachedCategories();
  const updatedList = current.filter((c) => c.id !== id);
  saveCachedCategories(updatedList);

  // 2. Sync to Firestore
  try {
    const ref = doc(db, LAB_CATEGORIES_COLLECTION, id);
    await deleteDoc(ref);
  } catch (firestoreErr) {
    console.warn("Firestore sync notice (deleted from local cache):", firestoreErr);
  }
}
