import { CurrencyPricing } from "./currency";

export interface ProjectSnapshot {
  sourceCode?: string; // e.g. "100% Included"
  support?: string; // e.g. "6 Months"
  updates?: string; // e.g. "Lifetime Free"
  documentation?: string; // e.g. "Comprehensive"
  version?: string; // e.g. "v2.4.0"
  platform?: string; // e.g. "Cross-Platform"
  status?: string; // e.g. "Production Ready"
  releaseDate?: string; // e.g. "Q3 2026"
}

export interface ProjectStory {
  idea?: string;
  problem?: string;
  solution?: string;
  value?: string;
}

export interface ProjectFAQ {
  question: string;
  answer: string;
}

export interface PricingFeatureItem {
  text: string;
  included: boolean;
}

export interface ProjectPricingTier {
  id: "individual" | "studio" | "enterprise" | string;
  name: string;
  tagline: string;
  price: string;
  currencySymbol?: string;
  usdPrice?: string;
  billingPeriod: string;
  isPopular?: boolean;
  badge?: string;
  features: PricingFeatureItem[];
  buttonText: string;
  buttonAction?: "checkout" | "contact" | "link";
}

export interface TechnicalSpecRow {
  feature: string;
  individual: string;
  studio: string;
  enterprise: string;
}

export interface ProjectItem {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  price: string | number;
  discount?: string | number;
  pricing?: CurrencyPricing[];
  pricingPlans?: ProjectPricingTier[];
  technicalSpecs?: TechnicalSpecRow[];
  tags: string[];
  tools?: string[];
  isPublic?: boolean;
  imageUrl?: string;
  image?: string;
  details?: string;
  installation?: string;

  // Cinematic Detail Fields
  youtubeUrl?: string; // e.g. "https://www.youtube.com/watch?v=Wo9IFU0-qZo"
  version?: string; // e.g. "2.4.0"
  platform?: string; // e.g. "Cross-Platform"
  status?: string; // e.g. "Active"
  releaseDate?: string; // e.g. "Q4 2024"
  buildStack?: string; // e.g. "Flutter & Gemini"
  availability?: string; // e.g. "iOS, Android, Web"

  snapshot?: ProjectSnapshot;
  story?: ProjectStory;
  whatsIncluded?: string[];
  notIncluded?: string[];
  faqs?: ProjectFAQ[];

  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

export const DEFAULT_YOUTUBE_URL = "https://www.youtube.com/watch?v=Wo9IFU0-qZo";

export const DEFAULT_SNAPSHOT: ProjectSnapshot = {
  sourceCode: "100% Included",
  support: "6 Months",
  updates: "Lifetime Free",
  documentation: "Comprehensive",
  version: "v2.4.0",
  platform: "Cross-Platform",
  status: "Production Ready",
  releaseDate: "Q3 2026",
};

export const DEFAULT_WHATS_INCLUDED: string[] = [
  "Full Frontend Source Code",
  "Full Backend Source Code",
  "Figma Design & Asset Files",
  "Database Schemas & Migrations",
  "Comprehensive API & Deployment Documentation",
  "6 Months Priority Developer Support",
];

export const DEFAULT_NOT_INCLUDED: string[] = [
  "Cloud Server Hosting Costs",
  "Custom Domain Name Registration",
  "Third-Party Paid API Keys (e.g. OpenAI / Google Cloud)",
  "Bespoke Custom Feature Development",
];

export const DEFAULT_FAQS: ProjectFAQ[] = [
  {
    question: "What is included with the commercial source code license?",
    answer:
      "You receive the complete production source code (frontend and backend), full architecture blueprints, database setup scripts, and commercial distribution rights to modify, deploy, and monetize under your own brand.",
  },
  {
    question: "How do I receive project files and future updates?",
    answer:
      "Upon license verification, you gain instant cloud repository access to pull the code immediately, complete with documentation, environment setup guides, and lifetime access to patch updates.",
  },
  {
    question: "Can I customize the features for my enterprise client?",
    answer:
      "Yes! The codebase is architected with modular, clean code principles, allowing your engineering team to easily customize UI themes, API endpoints, or database layers.",
  },
  {
    question: "Do you offer post-purchase deployment support?",
    answer:
      "Every license includes 6 months of priority developer support to help you configure dependencies, set up environment secrets, and resolve any build anomalies.",
  },
];

export function getDefaultPricingPlans(project?: Partial<ProjectItem>): ProjectPricingTier[] {
  if (Array.isArray(project?.pricingPlans) && project.pricingPlans.length === 3) {
    return project.pricingPlans;
  }

  let studioPrice = "180,000";
  let individualPrice = "45,000";
  let studioUsd = "1,500";
  let individualUsd = "390";
  const currencySymbol = "৳";

  if (project?.discount || project?.price) {
    const rawNum = String(project.discount || project.price).replace(/[^0-9]/g, "");
    const val = parseInt(rawNum, 10);
    if (!isNaN(val) && val > 0) {
      studioPrice = val.toLocaleString("en-US");
      const indivNum = Math.max(1000, Math.round(val * 0.25));
      individualPrice = indivNum.toLocaleString("en-US");
      studioUsd = Math.max(1, Math.round(val / 115)).toLocaleString("en-US");
      individualUsd = Math.max(1, Math.round(indivNum / 115)).toLocaleString("en-US");
    }
  }

  return [
    {
      id: "individual",
      name: "Individual Module",
      tagline: "For single project components.",
      price: individualPrice,
      currencySymbol,
      usdPrice: individualUsd,
      billingPeriod: "/one-time",
      isPopular: false,
      features: [
        { text: "Source Code Access", included: true },
        { text: "Standard Documentation", included: true },
        { text: "Premium Developer Support", included: false },
        { text: "Free Minor Updates", included: false },
        { text: "Commercial White-label Rights", included: false },
      ],
      buttonText: "Select Module",
      buttonAction: "checkout",
    },
    {
      id: "studio",
      name: "Studio License",
      tagline: "For full application ownership.",
      price: studioPrice,
      currencySymbol,
      usdPrice: studioUsd,
      billingPeriod: "/one-time",
      isPopular: true,
      badge: "Most Popular",
      features: [
        { text: "Full Architecture Source", included: true },
        { text: "Advanced Implementation Docs", included: true },
        { text: "3 Months Priority Support", included: true },
        { text: "Free Minor Updates", included: true },
        { text: "Commercial Deployment Rights", included: true },
      ],
      buttonText: "Acquire License",
      buttonAction: "checkout",
    },
    {
      id: "enterprise",
      name: "Enterprise Custom",
      tagline: "For tailored large-scale systems.",
      price: "Custom Quote",
      currencySymbol: "",
      usdPrice: "Custom Quote",
      billingPeriod: "Billed Annually or Project",
      isPopular: false,
      features: [
        { text: "Dedicated Engineering Team", included: true },
        { text: "SLA Guaranteed Uptime", included: true },
        { text: "Full White-label & Rebranding", included: true },
        { text: "24/7 Dedicated Support Channel", included: true },
        { text: "Custom API & Third-party Integrations", included: true },
      ],
      buttonText: "Contact Sales",
      buttonAction: "contact",
    },
  ];
}

export function formatUsdPrice(usdPrice?: string, bdtPrice?: string): string | null {
  if (usdPrice && usdPrice.trim() !== "") {
    const clean = usdPrice.trim();
    if (clean.toLowerCase().includes("quote")) return null;
    return clean.startsWith("$") ? clean : `$ ${clean}`;
  }
  if (!bdtPrice || bdtPrice.toLowerCase().includes("quote")) return null;
  const num = parseInt(bdtPrice.replace(/[^0-9]/g, ""), 10);
  if (isNaN(num) || num <= 0) return null;
  const converted = Math.max(1, Math.round(num / 115));
  return `$ ${converted.toLocaleString("en-US")}`;
}

export const DEFAULT_TECHNICAL_SPECS: TechnicalSpecRow[] = [
  {
    feature: "System Scalability",
    individual: "Component Level",
    studio: "Full Application",
    enterprise: "Global Cluster",
  },
  {
    feature: "Authentication Models",
    individual: "Basic JWT",
    studio: "OAuth2 + MFA",
    enterprise: "Custom SSO / SAML",
  },
  {
    feature: "Database Architecture",
    individual: "Single Node",
    studio: "Replicated Cluster",
    enterprise: "Multi-Region Sharding",
  },
  {
    feature: "SLA & Support",
    individual: "Community",
    studio: "Next Business Day Response",
    enterprise: "1-Hour Dedicated",
  },
  {
    feature: "Commercial Rights",
    individual: "Single Domain",
    studio: "Unlimited Internal Apps",
    enterprise: "Full White-label SaaS",
  },
];
