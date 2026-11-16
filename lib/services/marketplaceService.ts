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

// ── DEFAULT SHOWCASE DESIGNS (FALLBACK & SEED DATA) ──
export const DEFAULT_SHOWCASE_DESIGNS: LandingDesign[] = [
  {
    id: "seed_flowstack_saas",
    slug: "flowstack-saas",
    title: "FlowStack SaaS",
    shortDescription: "A focused software launch page with pricing proof and product storytelling.",
    fullDescription:
      "FlowStack SaaS is a high-converting, production-ready landing page template designed specifically for modern SaaS platforms, developer tools, and AI startups. Features dark & light mode, interactive pricing matrix, testimonials, feature highlights, and motion micro-interactions.",
    category: "saas",
    categoryName: "SaaS",
    tags: ["SaaS", "Dashboard", "Framer", "React", "Next.js", "Dark Mode"],
    price: 4900,
    originalPrice: 6900,
    discountPercent: 29,
    currency: "BDT",
    isFree: false,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop",
    previewImages: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?q=80&w=1600&auto=format&fit=crop",
    ],
    desktopScreenshot:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop",
    tabletScreenshot:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1600&auto=format&fit=crop",
    mobileScreenshot:
      "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://www.youtube.com/embed/L_LUpnjgPso",
    liveDemoUrl: "https://www.devenginehq.com",
    deliveryType: "zip_file",
    whatsIncluded: [
      "Figma Component Library & UI Kit (.fig)",
      "Next.js 14 & Tailwind CSS Source Code",
      "Framer Motion Interactive Animations",
      "Responsive Mobile & Tablet Breakpoints",
      "SEO Optimized Meta & OpenGraph Tags",
      "Commercial Use License & Free Updates",
    ],
    technologies: ["Next.js", "React", "Tailwind CSS", "TypeScript", "Framer Motion", "Figma"],
    license: "Commercial License · Unlimited Client & Commercial Projects",
    isFeatured: true,
    isPopular: true,
    isTrending: false,
    displayOrder: 0,
    status: "published",
    rating: 4.9,
    reviewCount: 142,
    salesCount: 3200,
    viewsCount: 1420,
    favoritesCount: 14,
    seoTitle: "FlowStack SaaS | Landing Page Design",
    seoDescription:
      "High-converting SaaS landing page with clean layout, engaging visuals, and interactive pricing proof.",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "seed_framefolio",
    slug: "framefolio",
    title: "Framefolio",
    shortDescription: "A refined portfolio page for designers, photographers, and independent makers.",
    fullDescription:
      "Framefolio is a minimal, typography-focused portfolio landing page designed for world-class designers, digital artists, and creative agencies. Highlights client work, project case studies, awards, and an interactive contact reel.",
    category: "portfolio",
    categoryName: "Portfolio",
    tags: ["Portfolio", "Creative", "Minimal", "Grid", "Case Studies"],
    price: 3900,
    originalPrice: 5500,
    discountPercent: 29,
    currency: "BDT",
    isFree: false,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1600&auto=format&fit=crop",
    previewImages: [
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1600&auto=format&fit=crop",
    ],
    desktopScreenshot:
      "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1600&auto=format&fit=crop",
    tabletScreenshot:
      "https://images.unsplash.com/photo-1541701494587-cb58502866ab?q=80&w=1600&auto=format&fit=crop",
    mobileScreenshot:
      "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://www.youtube.com/embed/L_LUpnjgPso",
    liveDemoUrl: "https://www.devenginehq.com",
    deliveryType: "zip_file",
    whatsIncluded: [
      "Figma Component Library",
      "Next.js & Tailwind CSS Source",
      "Custom Case Study Layouts",
      "Dark / Light Switcher",
      "Commercial License",
    ],
    technologies: ["Next.js", "Tailwind CSS", "Figma", "TypeScript"],
    license: "Commercial License · Unlimited Projects",
    isFeatured: false,
    isPopular: false,
    isTrending: true,
    displayOrder: 1,
    status: "published",
    rating: 4.8,
    reviewCount: 96,
    salesCount: 1800,
    viewsCount: 890,
    favoritesCount: 22,
    seoTitle: "Framefolio | Creative Portfolio Design",
    seoDescription:
      "Refined portfolio landing page for designers, photographers, and independent makers.",
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "seed_northstar_creative",
    slug: "northstar-creative",
    title: "Northstar Creative",
    shortDescription: "A focused agency landing page designed to put selected client work first.",
    fullDescription:
      "Northstar Creative delivers a bold, editorial aesthetic tailored for boutique agencies, motion studios, and branding consultancies. Includes interactive services grid, client logos, video reels, and inquiry intake.",
    category: "agency",
    categoryName: "Agency",
    tags: ["Agency", "Editorial", "Studio", "Branding", "Creative"],
    price: 5900,
    originalPrice: 7900,
    discountPercent: 25,
    currency: "BDT",
    isFree: false,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop",
    previewImages: [
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?q=80&w=1600&auto=format&fit=crop",
    ],
    desktopScreenshot:
      "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1600&auto=format&fit=crop",
    tabletScreenshot:
      "https://images.unsplash.com/photo-1522542550221-31fd19575a2d?q=80&w=1600&auto=format&fit=crop",
    mobileScreenshot:
      "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://www.youtube.com/embed/L_LUpnjgPso",
    liveDemoUrl: "https://www.devenginehq.com",
    deliveryType: "zip_file",
    whatsIncluded: [
      "Figma Design System",
      "Production Next.js Template",
      "Motion Interactions",
      "Commercial License",
      "Priority Support",
    ],
    technologies: ["Next.js", "Tailwind CSS", "Framer Motion", "Figma"],
    license: "Commercial License · Unlimited Projects",
    isFeatured: true,
    isPopular: false,
    isTrending: false,
    displayOrder: 2,
    status: "published",
    rating: 4.8,
    reviewCount: 210,
    salesCount: 4600,
    viewsCount: 2300,
    favoritesCount: 45,
    seoTitle: "Northstar Creative | Agency Landing Page Design",
    seoDescription: "Focused agency landing page designed to put selected client work first.",
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "seed_teamly",
    slug: "teamly",
    title: "Teamly",
    shortDescription: "A modern SaaS landing page for team collaboration and productivity.",
    fullDescription:
      "Teamly is a sleek, modern SaaS landing page engineered for collaboration suites, task managers, and developer productivity tools. Features interactive feature cards, pricing tiers, and client reviews.",
    category: "saas",
    categoryName: "SaaS",
    tags: ["SaaS", "Productivity", "Collaboration", "Clean UI", "Next.js"],
    price: 4500,
    originalPrice: 5900,
    discountPercent: 24,
    currency: "BDT",
    isFree: false,
    thumbnailUrl:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop",
    previewImages: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop",
    ],
    desktopScreenshot:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1600&auto=format&fit=crop",
    mobileScreenshot:
      "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?q=80&w=1200&auto=format&fit=crop",
    videoUrl: "https://www.youtube.com/embed/L_LUpnjgPso",
    liveDemoUrl: "https://www.devenginehq.com",
    deliveryType: "zip_file",
    whatsIncluded: [
      "Figma UI Kit & Tokens",
      "Production Next.js Source",
      "Interactive Components",
      "Commercial License",
    ],
    technologies: ["Next.js", "Tailwind CSS", "React", "Figma"],
    license: "Commercial License · Unlimited Projects",
    isFeatured: true,
    isPopular: false,
    isTrending: true,
    displayOrder: 3,
    status: "published",
    rating: 4.8,
    reviewCount: 210,
    salesCount: 2400,
    viewsCount: 1950,
    favoritesCount: 38,
    seoTitle: "Teamly | Team Collaboration SaaS Landing Page",
    seoDescription: "A modern SaaS landing page for team collaboration and productivity.",
    createdAt: "2026-01-04T00:00:00.000Z",
    updatedAt: "2026-01-04T00:00:00.000Z",
  },
];

const DEFAULT_FALLBACK_REVIEWS: Record<string, DesignReview[]> = {
  "flowstack-saas": [
    {
      id: "rev_1",
      designId: "seed_flowstack_saas",
      designTitle: "FlowStack SaaS",
      customerName: "Alex Rivera",
      customerEmail: "alex@techlaunch.io",
      rating: 5,
      comment:
        "Saved our engineering team at least 3 weeks of front-end styling. The animations are butter-smooth and look incredible on desktop and mobile.",
      status: "approved",
      createdAt: "2026-02-10T14:30:00.000Z",
    },
    {
      id: "rev_2",
      designId: "seed_flowstack_saas",
      designTitle: "FlowStack SaaS",
      customerName: "Sarah Chen",
      customerEmail: "sarah@lumina.design",
      rating: 5,
      comment:
        "Super clean code, well-structured components and the video preview matches the delivered files 100%. Highly recommended!",
      status: "approved",
      createdAt: "2026-02-14T09:15:00.000Z",
    },
  ],
  framefolio: [
    {
      id: "rev_3",
      designId: "seed_framefolio",
      designTitle: "Framefolio",
      customerName: "Liam Vance",
      customerEmail: "liam@vance.studio",
      rating: 5,
      comment:
        "Minimal, gorgeous typography, and the dark mode switch is pure elegance. Client inquiries jumped by 40% after re-launching with Framefolio.",
      status: "approved",
      createdAt: "2026-02-12T11:00:00.000Z",
    },
  ],
  "northstar-creative": [
    {
      id: "rev_4",
      designId: "seed_northstar_creative",
      designTitle: "Northstar Creative",
      customerName: "Elena Rostova",
      customerEmail: "elena@nordicmotion.co",
      rating: 5,
      comment:
        "Best investment for our agency this year. Clean Figma layers and flawless responsive layout out of the box.",
      status: "approved",
      createdAt: "2026-02-15T16:20:00.000Z",
    },
  ],
};

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

    if (designs.length === 0) {
      designs = DEFAULT_SHOWCASE_DESIGNS.filter((d) => {
        if (!params?.category || params.category === "all") return true;
        return d.category === params.category;
      });
    }

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
    console.warn("Failed to load designs from Firestore, using showcase fallback:", err);
    let designs = DEFAULT_SHOWCASE_DESIGNS.filter((d) => {
      if (!params?.category || params.category === "all") return true;
      return d.category === params.category;
    });
    if (params?.limitCount) {
      designs = designs.slice(0, params.limitCount);
    }
    return designs;
  }
}

export async function getDesignBySlug(slug: string): Promise<LandingDesign | null> {
  const normalizedSlug = (slug || "").trim().toLowerCase();
  try {
    // 1. Try public query with status == "published" (required by firestore.rules for non-admin reads)
    const qPub = query(
      collection(db, DESIGNS_COL),
      where("slug", "==", normalizedSlug),
      where("status", "==", "published"),
      limit(1)
    );
    const snapPub = await getDocs(qPub);
    if (!snapPub.empty) {
      const docData = snapPub.docs[0];
      const design = { id: docData.id, ...docData.data() } as LandingDesign;

      // Increment view count non-blockingly
      updateDoc(docData.ref, { viewsCount: increment(1) }).catch(() => {});

      return design;
    }

    // 2. Try without status constraint in case an admin/staff user is viewing a draft
    try {
      const qAny = query(collection(db, DESIGNS_COL), where("slug", "==", normalizedSlug), limit(1));
      const snapAny = await getDocs(qAny);
      if (!snapAny.empty) {
        const docData = snapAny.docs[0];
        const design = { id: docData.id, ...docData.data() } as LandingDesign;
        return design;
      }
    } catch {}

    // 3. Fallback to default showcase designs (e.g. flowstack-saas, framefolio, northstar-creative)
    const fallback = DEFAULT_SHOWCASE_DESIGNS.find((d) => d.slug.toLowerCase() === normalizedSlug);
    if (fallback) return fallback;

    return null;
  } catch (err) {
    console.warn("Failed to fetch design by slug, using showcase fallback:", err);
    return DEFAULT_SHOWCASE_DESIGNS.find((d) => d.slug.toLowerCase() === normalizedSlug) || null;
  }
}

// ── 3. FAVORITES & GUEST AUTH SESSION ──
export interface GuestSession {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "guest";
  isGuest: boolean;
  loggedIn: boolean;
  loginTime?: number;
}

export function getGuestUser(): GuestSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("devengine_guest");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.uid) {
        return parsed as GuestSession;
      }
    }
  } catch {}

  // If Firebase Auth has a logged-in user
  if (auth.currentUser) {
    const session: GuestSession = {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email || "",
      fullName: auth.currentUser.displayName || auth.currentUser.email?.split("@")[0] || "Guest User",
      role: "guest",
      isGuest: true,
      loggedIn: true,
    };
    try {
      localStorage.setItem("devengine_guest", JSON.stringify(session));
    } catch {}
    return session;
  }

  return null;
}

export function checkIsGuestLoggedIn(): boolean {
  return Boolean(getGuestUser());
}

export async function toggleFavoriteDesign(designId: string, uid?: string): Promise<boolean> {
  const currentUid = uid || auth.currentUser?.uid || getGuestUser()?.uid;
  if (!currentUid) throw new Error("Sign in required");

  // Try API route first if available
  try {
    const res = await fetch("/api/marketplace/favorite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ designId, uid: currentUid }),
    });
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.isFavorite);
    }
  } catch {}

  // Direct client Firestore operation with safety
  const favDocId = `${currentUid}_${designId}`;
  const favRef = doc(db, FAVORITES_COL, favDocId);
  
  let exists = false;
  try {
    const snap = await getDoc(favRef);
    exists = snap.exists();
  } catch (err) {
    console.warn("getDoc error, defaulting to add:", err);
  }

  if (exists) {
    await deleteDoc(favRef);
    return false;
  } else {
    await setDoc(favRef, {
      id: favDocId,
      userId: currentUid,
      customerUid: currentUid,
      designId,
      createdAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  }
}

export async function checkIsFavorite(designId: string, uid?: string): Promise<boolean> {
  const currentUid = uid || auth.currentUser?.uid || getGuestUser()?.uid;
  if (!currentUid) return false;
  try {
    const favRef = doc(db, FAVORITES_COL, `${currentUid}_${designId}`);
    const snap = await getDoc(favRef);
    return snap.exists();
  } catch {
    return false;
  }
}

export async function getUserFavorites(uid: string): Promise<string[]> {
  try {
    const q1 = query(collection(db, FAVORITES_COL), where("userId", "==", uid));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return snap1.docs.map((d) => d.data().designId);
    }
    const q2 = query(collection(db, FAVORITES_COL), where("customerUid", "==", uid));
    const snap2 = await getDocs(q2);
    return snap2.docs.map((d) => d.data().designId);
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
    if (items.length > 0) {
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return items;
    }

    // Fallback showcase reviews if none in Firestore
    const matchedKey = Object.keys(DEFAULT_FALLBACK_REVIEWS).find(
      (k) => designId.toLowerCase().includes(k) || k.includes(designId.toLowerCase())
    );
    return matchedKey ? DEFAULT_FALLBACK_REVIEWS[matchedKey] : [];
  } catch {
    const matchedKey = Object.keys(DEFAULT_FALLBACK_REVIEWS).find(
      (k) => designId.toLowerCase().includes(k) || k.includes(designId.toLowerCase())
    );
    return matchedKey ? DEFAULT_FALLBACK_REVIEWS[matchedKey] : [];
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
    howItWorksVideoUrl: "https://www.youtube.com/watch?v=LXb3EKWsInQ",
    howItWorksTitle: "How DevEngine Designs Works",
    howItWorksDescription: "Watch a quick walkthrough of how you can explore, customize, and license production-ready landing page designs with instant digital delivery.",
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

export async function adminAddManualReview(review: Partial<DesignReview>) {
  return adminRequest("add_manual_review", { review }) as Promise<{ review: DesignReview }>;
}

export async function adminSeedDefaults() {
  return adminRequest("seed_defaults") as Promise<{ success: boolean; message: string }>;
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
    try {
      headers["Authorization"] = `Bearer ${await user.getIdToken()}`;
    } catch {}
  }

  const res = await fetch("/api/marketplace/order", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...order,
      customerUid: user?.uid || undefined,
    }),
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

export async function getUserOrders(email?: string | null, uid?: string | null): Promise<MarketplaceOrder[]> {
  const results: MarketplaceOrder[] = [];
  const seenIds = new Set<string>();

  try {
    if (uid) {
      const qUid = query(collection(db, ORDERS_COL), where("customerUid", "==", uid));
      const snapUid = await getDocs(qUid);
      snapUid.docs.forEach((d) => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          results.push({ id: d.id, ...d.data() } as MarketplaceOrder);
        }
      });
    }

    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const qEmail = query(collection(db, ORDERS_COL), where("customerEmail", "==", cleanEmail));
      const snapEmail = await getDocs(qEmail);
      snapEmail.docs.forEach((d) => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          results.push({ id: d.id, ...d.data() } as MarketplaceOrder);
        }
      });
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results;
  } catch (err) {
    console.error("Error fetching user orders:", err);
    return [];
  }
}

export async function getUserReviews(uid?: string | null, email?: string | null): Promise<DesignReview[]> {
  const results: DesignReview[] = [];
  const seenIds = new Set<string>();

  try {
    if (uid) {
      const qUid = query(collection(db, REVIEWS_COL), where("customerUid", "==", uid));
      const snapUid = await getDocs(qUid);
      snapUid.docs.forEach((d) => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          results.push({ id: d.id, ...d.data() } as DesignReview);
        }
      });
    }

    if (email) {
      const qEmail = query(collection(db, REVIEWS_COL), where("customerEmail", "==", email.trim().toLowerCase()));
      const snapEmail = await getDocs(qEmail);
      snapEmail.docs.forEach((d) => {
        if (!seenIds.has(d.id)) {
          seenIds.add(d.id);
          results.push({ id: d.id, ...d.data() } as DesignReview);
        }
      });
    }

    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return results;
  } catch (err) {
    console.error("Error fetching user reviews:", err);
    return [];
  }
}

export async function getUserFavoriteDesigns(uid: string): Promise<LandingDesign[]> {
  try {
    const favoriteIds = await getUserFavorites(uid);
    if (!favoriteIds.length) return [];

    const designs: LandingDesign[] = [];
    for (const designId of favoriteIds) {
      try {
        const snap = await getDoc(doc(db, DESIGNS_COL, designId));
        if (snap.exists()) {
          designs.push({ id: snap.id, ...snap.data() } as LandingDesign);
        } else {
          // Check fallback showcase
          const fallback = DEFAULT_SHOWCASE_DESIGNS.find((d) => d.id === designId || d.slug === designId);
          if (fallback) designs.push(fallback);
        }
      } catch {}
    }
    return designs;
  } catch {
    return [];
  }
}

