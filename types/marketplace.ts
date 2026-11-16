export interface LandingDesign {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  category: string; // category slug or id
  categoryName: string;
  tags: string[];
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  currency: string; // "USD" | "BDT"
  isFree?: boolean;

  // Visual Assets
  thumbnailUrl: string; // Main card preview
  previewImages: string[]; // High-res gallery screenshots for long-form scroll
  desktopScreenshot?: string;
  tabletScreenshot?: string;
  mobileScreenshot?: string;
  videoUrl?: string; // YouTube, Vimeo, or direct MP4 motion video preview

  // Demo & Delivery
  liveDemoUrl?: string; // Clickable live preview demo
  deliveryType: "download_link" | "figma_link" | "zip_file" | "github_repo";
  deliveryFileUrl?: string; // Protected delivery link or asset
  whatsIncluded: string[];
  technologies: string[];
  license: string;

  // Marketplace Controls
  isFeatured: boolean;
  isPopular: boolean;
  isTrending: boolean;
  displayOrder: number;
  status: "published" | "draft" | "archived";

  // Statistics (Real calculated metrics)
  rating: number; // e.g. 5.0
  reviewCount: number;
  salesCount: number;
  viewsCount: number;
  favoritesCount: number;

  // SEO & Meta
  seoTitle?: string;
  seoDescription?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;

  // Compatibility aliases
  trending?: boolean;
  featured?: boolean;
  ratingAverage?: number;
  totalSales?: number;
}

export interface DesignCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  coverImageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  designsCount?: number;
  createdAt: string;
}

export interface MarketplaceOrder {
  id: string; // e.g. "LPD-2026-X892A"
  designId: string;
  designTitle: string;
  designSlug: string;
  thumbnailUrl: string;
  amount: number;
  currency: string;

  // Customer info
  customerUid?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: string;

  // Payment
  paymentMethod: "bKash" | "Nagad" | "Rocket" | "Dutch-Bangla Bank" | "BRAC Bank" | "Card" | "Free";
  transactionId: string;
  senderNumberOrAccount?: string;
  status: "Pending Verification" | "Verified" | "Rejected";
  deliveryStatus: "Pending" | "Delivered";

  // Security & Delivery
  downloadToken?: string;
  deliveryUrl?: string;
  verifiedAt?: string;
  createdAt: string;
  updatedAt?: string;

  // Compatibility aliases
  orderNumber?: string;
  paymentProvider?: string;
  paymentStatus?: string;
}

export interface DesignReview {
  id: string;
  designId: string;
  designTitle: string;
  designSlug?: string;
  orderId?: string;
  customerUid?: string;
  customerName: string;
  customerEmail?: string;
  customerAvatar?: string;
  rating: number; // 1 to 5
  reviewText?: string;
  comment?: string;
  body?: string;
  displayName?: string;
  isVerifiedPurchase?: boolean;
  status: "approved" | "pending" | "hidden";
  createdAt: string;
  updatedAt?: string;
}

export type LandingPageDesign = LandingDesign;
export type LandingPageCategory = DesignCategory;
export type LandingPageOrder = MarketplaceOrder;
export type LandingPageReview = DesignReview;

export const DEFAULT_MARKETPLACE_SETTINGS: MarketplaceSettings = {
  marketplaceTitle: "Explore Landing Page Designs",
  marketplaceSubtitle: "Discover professionally crafted landing pages built with motion & clean code.",
  defaultCurrency: "USD",
  itemsPerPage: 12,
  defaultLicense: "Commercial Lifetime License · Unlimited Projects",
  allowFreeListings: true,
  featuredDesignIds: [],
  howItWorksVideoUrl: "https://www.youtube.com/watch?v=LXb3EKWsInQ",
  howItWorksTitle: "How DevEngine Designs Works",
  howItWorksDescription: "Watch a quick walkthrough of how you can explore, customize, and license production-ready landing page designs with instant digital delivery.",
  updatedAt: new Date().toISOString(),
};

export interface DesignFavorite {
  id: string;
  customerUid: string;
  designId: string;
  createdAt: string;
}

export interface MarketplaceSettings {
  marketplaceTitle: string;
  marketplaceSubtitle: string;
  defaultCurrency: string;
  itemsPerPage: number;
  defaultLicense: string;
  allowFreeListings: boolean;
  featuredDesignIds: string[];
  bannerNotice?: string;
  howItWorksVideoUrl?: string;
  howItWorksTitle?: string;
  howItWorksDescription?: string;
  updatedAt: string;
}

export const DEFAULT_MARKETPLACE_CATEGORIES: Omit<DesignCategory, "id" | "createdAt">[] = [
  { name: "All", slug: "all", description: "Explore every curated landing page design", icon: "dashboard", displayOrder: 0, isActive: true },
  { name: "SaaS", slug: "saas", description: "Modern software & cloud service landing pages", icon: "cloud", displayOrder: 1, isActive: true },
  { name: "Crypto & Trading", slug: "crypto-trading", description: "Engaging fintech, blockchain & trading platform designs", icon: "currency_bitcoin", displayOrder: 2, isActive: true },
  { name: "Agency", slug: "agency", description: "Creative studios, branding and design agencies", icon: "palette", displayOrder: 3, isActive: true },
  { name: "E-Commerce", slug: "ecommerce", description: "High-converting online store & product landing pages", icon: "shopping_bag", displayOrder: 4, isActive: true },
  { name: "AI & Technology", slug: "ai-technology", description: "Artificial intelligence, deep tech & future labs", icon: "psychology", displayOrder: 5, isActive: true },
  { name: "Startup", slug: "startup", description: "High-velocity launchpads for early-stage ventures", icon: "rocket_launch", displayOrder: 6, isActive: true },
  { name: "Portfolio", slug: "portfolio", description: "Personal branding, creator & executive portfolios", icon: "person", displayOrder: 7, isActive: true },
  { name: "Healthcare", slug: "healthcare", description: "Medical clinics, health tech & wellness platforms", icon: "medical_services", displayOrder: 8, isActive: true },
  { name: "Real Estate", slug: "real-estate", description: "Luxury architecture, property & estate showcases", icon: "apartment", displayOrder: 9, isActive: true },
  { name: "Mobile Apps", slug: "mobile-apps", description: "iOS & Android native application showcase pages", icon: "smartphone", displayOrder: 10, isActive: true },
  { name: "Coming Soon", slug: "coming-soon", description: "Pre-launch hype, waitlists & newsletter capture", icon: "schedule", displayOrder: 11, isActive: true },
];
