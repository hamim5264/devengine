import { db, auth } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import type {
  LandingDesign,
  DesignCategory,
  MarketplaceOrder,
  DesignReview,
  DesignFavorite,
  MarketplaceSettings,
} from "@/types/marketplace";
import { DEFAULT_MARKETPLACE_CATEGORIES } from "@/types/marketplace";

const DESIGNS_COL = "landing_page_designs";
const CATEGORIES_COL = "landing_page_categories";
const ORDERS_COL = "landing_page_orders";
const REVIEWS_COL = "landing_page_reviews";
const FAVORITES_COL = "landing_page_favorites";
const SETTINGS_DOC = "landing_page_settings/main";

// ── 1. CATEGORIES ──
export async function getMarketplaceCategories(): Promise<DesignCategory[]> {
  try {
    const q = query(collection(db, CATEGORIES_COL), orderBy("displayOrder", "asc"));
    const snap = await getDocs(q);

    if (snap.empty) {
      // Seed default categories if none exist yet
      const seeded: DesignCategory[] = [];
      for (const cat of DEFAULT_MARKETPLACE_CATEGORIES) {
        const docRef = doc(collection(db, CATEGORIES_COL));
        const item: DesignCategory = {
          ...cat,
          id: docRef.id,
          createdAt: new Date().toISOString(),
          designsCount: 0,
        };
        await setDoc(docRef, item).catch(() => {});
        seeded.push(item);
      }
      return seeded;
    }

    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DesignCategory));
  } catch (err) {
    console.warn("Could not load categories, using fallback:", err);
    return DEFAULT_MARKETPLACE_CATEGORIES.map((c, i) => ({
      ...c,
      id: `fallback_${i}`,
      createdAt: new Date().toISOString(),
    }));
  }
}

// ── 2. DESIGNS (PUBLIC) ──
export async function getPublishedDesigns(params?: {
  category?: string;
  sortBy?: "popular" | "sales" | "rating" | "newest" | "price_asc" | "price_desc";
  limitCount?: number;
}): Promise<LandingDesign[]> {
  try {
    let q = query(collection(db, DESIGNS_COL), where("status", "==", "published"));

    if (params?.category && params.category !== "all") {
      q = query(q, where("category", "==", params.category));
    }

    const snap = await getDocs(q);
    let designs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as LandingDesign));

    // Sort in memory for maximum reliability
    const sort = params?.sortBy || "popular";
    designs.sort((a, b) => {
      if (sort === "sales") return (b.salesCount || 0) - (a.salesCount || 0);
      if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sort === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === "price_asc") return (a.price || 0) - (b.price || 0);
      if (sort === "price_desc") return (b.price || 0) - (a.price || 0);
      // Popular (default)
      return (
        (b.isPopular ? 1000 : 0) +
        (b.isFeatured ? 500 : 0) +
        (b.salesCount || 0) * 5 +
        (b.viewsCount || 0) -
        ((a.isPopular ? 1000 : 0) + (a.isFeatured ? 500 : 0) + (a.salesCount || 0) * 5 + (a.viewsCount || 0))
      );
    });

    if (params?.limitCount) {
      designs = designs.slice(0, params.limitCount);
    }

    return designs;
  } catch (err) {
    console.error("Failed to load designs:", err);
    return [];
  }
}

export async function getDesignBySlug(slug: string): Promise<LandingDesign | null> {
  try {
    const q = query(collection(db, DESIGNS_COL), where("slug", "==", slug), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docData = snap.docs[0];
    const design = { id: docData.id, ...docData.data() } as LandingDesign;

    // Increment view count non-blockingly
    updateDoc(docData.ref, { viewsCount: increment(1) }).catch(() => {});

    return design;
  } catch (err) {
    console.error("Failed to fetch design by slug:", err);
    return null;
  }
}

// ── 3. FAVORITES ──
export async function toggleFavoriteDesign(designId: string, uid: string): Promise<boolean> {
  const favDocId = `${uid}_${designId}`;
  const favRef = doc(db, FAVORITES_COL, favDocId);
  const snap = await getDoc(favRef);

  const designRef = doc(db, DESIGNS_COL, designId);

  if (snap.exists()) {
    await deleteDoc(favRef);
    await updateDoc(designRef, { favoritesCount: increment(-1) }).catch(() => {});
    return false;
  } else {
    await setDoc(favRef, {
      id: favDocId,
      customerUid: uid,
      designId,
      createdAt: new Date().toISOString(),
    });
    await updateDoc(designRef, { favoritesCount: increment(1) }).catch(() => {});
    return true;
  }
}

export async function checkIsFavorite(designId: string, uid?: string): Promise<boolean> {
  if (!uid) return false;
  try {
    const favRef = doc(db, FAVORITES_COL, `${uid}_${designId}`);
    const snap = await getDoc(favRef);
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getUserFavorites(uid: string): Promise<string[]> {
  try {
    const q = query(collection(db, FAVORITES_COL), where("customerUid", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data().designId);
  } catch {
    return [];
  }
}

// ── 4. REVIEWS ──
export async function getDesignReviews(designId: string): Promise<DesignReview[]> {
  try {
    const q = query(
      collection(db, REVIEWS_COL),
      where("designId", "==", designId),
      where("status", "==", "approved")
    );
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DesignReview));
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return items;
  } catch {
    return [];
  }
}

export async function submitDesignReview(review: Omit<DesignReview, "id" | "createdAt" | "status">): Promise<string> {
  const docRef = doc(collection(db, REVIEWS_COL));
  const newReview: DesignReview = {
    ...review,
    id: docRef.id,
    status: "approved",
    createdAt: new Date().toISOString(),
  };
  await setDoc(docRef, newReview);

  // Recalculate average rating on design
  try {
    const allReviews = await getDesignReviews(review.designId);
    allReviews.push(newReview);
    const avg = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await updateDoc(doc(db, DESIGNS_COL, review.designId), {
      rating: Number(avg.toFixed(1)),
      reviewCount: allReviews.length,
    });
  } catch {}

  return docRef.id;
}

// ── 5. SETTINGS ──
export async function getMarketplaceSettings(): Promise<MarketplaceSettings> {
  const fallback: MarketplaceSettings = {
    marketplaceTitle: "Explore Landing Page Designs",
    marketplaceSubtitle: "Discover professionally crafted, high-converting landing pages built with motion & clean code.",
    defaultCurrency: "USD",
    itemsPerPage: 12,
    defaultLicense: "Commercial License · Unlimited Projects",
    allowFreeListings: true,
    featuredDesignIds: [],
    updatedAt: new Date().toISOString(),
  };

  try {
    const snap = await getDoc(doc(db, SETTINGS_DOC));
    if (snap.exists()) {
      return { ...fallback, ...snap.data() } as MarketplaceSettings;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

// ── 6. ADMIN API CLIENT HELPERS ──
async function adminRequest(action: string, payload: Record<string, any> = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Admin session required. Please sign in.");
  }
  const token = await user.getIdToken();
  const res = await fetch("/api/admin/marketplace", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Admin marketplace request failed.");
  }
  return data;
}

export async function adminFetchAllMarketplace() {
  return adminRequest("fetch_all") as Promise<{
    designs: LandingDesign[];
    categories: DesignCategory[];
    orders: MarketplaceOrder[];
    reviews: DesignReview[];
    settings: MarketplaceSettings | null;
  }>;
}

export async function adminSaveDesign(design: Partial<LandingDesign>) {
  return adminRequest("save_design", { design }) as Promise<{ design: LandingDesign }>;
}

export async function adminDeleteDesign(id: string) {
  return adminRequest("delete_design", { id });
}

export async function adminSaveCategory(category: Partial<DesignCategory>) {
  return adminRequest("save_category", { category }) as Promise<{ category: DesignCategory }>;
}

export async function adminDeleteCategory(id: string, slug?: string) {
  return adminRequest("delete_category", { id, slug });
}

export async function adminUpdateOrder(orderId: string, status?: string, deliveryStatus?: string) {
  return adminRequest("update_order", { orderId, status, deliveryStatus }) as Promise<{ order: MarketplaceOrder }>;
}

export async function adminUpdateReviewStatus(id: string, status: "approved" | "hidden" | "deleted") {
  return adminRequest("update_review_status", { id, status });
}

export async function adminGetAnalytics() {
  return adminRequest("analytics") as Promise<{ analytics: any }>;
}

export async function adminSaveSettings(settings: Partial<MarketplaceSettings>) {
  return adminRequest("save_settings", { settings }) as Promise<{ settings: MarketplaceSettings }>;
}

// ── 7. ORDER & CHECKOUT CLIENT HELPERS ──
export async function createMarketplaceOrder(order: {
  designId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;
  paymentMethod: string;
  transactionId: string;
  senderNumberOrAccount?: string;
}): Promise<{ orderId: string; status: string; amount: number; currency: string }> {
  const user = auth.currentUser;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (user) {
    headers["Authorization"] = `Bearer ${await user.getIdToken()}`;
  }

  const res = await fetch("/api/marketplace/order", {
    method: "POST",
    headers,
    body: JSON.stringify(order),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Failed to create marketplace order.");
  }
  return data;
}

export async function getMarketplaceOrderById(orderId: string): Promise<MarketplaceOrder | null> {
  try {
    const snap = await getDoc(doc(db, ORDERS_COL, orderId));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as MarketplaceOrder;
    }
    return null;
  } catch (err) {
    console.error("Error fetching order:", err);
    return null;
  }
}

