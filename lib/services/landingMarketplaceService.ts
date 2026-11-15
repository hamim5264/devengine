import {
  getMarketplaceCategories,
  getPublishedDesigns,
  getDesignBySlug,
  getMarketplaceSettings,
  getUserFavorites,
  toggleFavoriteDesign,
  getMarketplaceOrderById,
  adminFetchAllMarketplace,
  adminSaveDesign,
  adminDeleteDesign,
  adminSaveCategory,
  adminDeleteCategory,
  adminUpdateOrder,
  adminUpdateReviewStatus,
  adminSaveSettings,
} from "./marketplaceService";
import type {
  LandingDesign,
  DesignCategory,
  MarketplaceOrder,
  DesignReview,
  MarketplaceSettings,
} from "@/types/marketplace";
import { db, auth } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit } from "firebase/firestore";

// Compatibility re-exports and adapter methods
export async function getAllMarketplaceDesigns(): Promise<LandingDesign[]> {
  const data = await adminFetchAllMarketplace().catch(() => ({ designs: [] }));
  return data.designs || [];
}

export async function getAllMarketplaceCategories(): Promise<DesignCategory[]> {
  return getMarketplaceCategories();
}

export async function getAllMarketplaceOrders(): Promise<MarketplaceOrder[]> {
  const data = await adminFetchAllMarketplace().catch(() => ({ orders: [] }));
  return data.orders || [];
}

export async function getAllMarketplaceReviews(): Promise<DesignReview[]> {
  const data = await adminFetchAllMarketplace().catch(() => ({ reviews: [] }));
  return data.reviews || [];
}

export { getMarketplaceSettings };

export async function saveMarketplaceDesign(design: any, id?: string) {
  return adminSaveDesign({ ...design, id: id || design.id });
}

export async function duplicateMarketplaceDesign(design: any) {
  return adminSaveDesign({
    ...design,
    id: undefined,
    title: `${design.title} (Copy)`,
    slug: `${design.slug}-copy-${Date.now().toString().slice(-4)}`,
    status: "draft",
    salesCount: 0,
    reviewCount: 0,
    viewsCount: 0,
  });
}

export async function deleteMarketplaceDesign(id: string) {
  return adminDeleteDesign(id);
}

export async function saveMarketplaceCategory(category: any, id?: string) {
  return adminSaveCategory({ ...category, id: id || category.id });
}

export async function deleteMarketplaceCategory(id: string) {
  return adminDeleteCategory(id);
}

export async function updateMarketplaceReviewStatus(id: string, status: any) {
  return adminUpdateReviewStatus(id, status);
}

export async function saveMarketplaceSettings(settings: any) {
  return adminSaveSettings(settings);
}

export async function getActiveCategories() {
  const cats = await getMarketplaceCategories();
  return cats.filter((c) => c.isActive);
}

export async function countPublishedDesigns() {
  const designs = await getPublishedDesigns();
  return designs.length;
}

export async function browsePublishedDesigns(params?: {
  pageSize?: number;
  categoryId?: string;
  cursor?: any;
}) {
  const designs = await getPublishedDesigns({
    category: params?.categoryId,
    limitCount: params?.pageSize || 20,
  });
  return {
    designs,
    cursor: null,
    hasMore: false,
  };
}

export async function getFavoriteIds(userId: string): Promise<Set<string>> {
  const favs = await getUserFavorites(userId);
  return new Set(favs);
}

export async function toggleMarketplaceFavorite(userId: string, designId: string, enabled: boolean) {
  return toggleFavoriteDesign(designId, userId);
}

export async function getMarketplaceDesignBySlug(slug: string) {
  return getDesignBySlug(slug);
}

export async function getMarketplaceDesignById(id: string): Promise<LandingDesign | null> {
  try {
    const snap = await getDoc(doc(db, "landing_page_designs", id));
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as LandingDesign;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getMarketplaceOrders(userId: string): Promise<MarketplaceOrder[]> {
  try {
    const q = query(
      collection(db, "landing_page_orders"),
      where("customerUid", "==", userId),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MarketplaceOrder));
  } catch {
    return [];
  }
}

export async function getMarketplaceOrder(orderId: string): Promise<MarketplaceOrder | null> {
  return getMarketplaceOrderById(orderId);
}
