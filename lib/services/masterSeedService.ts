import { db } from "@/lib/firebase";
import { doc, setDoc, collection, getDocs, Timestamp, serverTimestamp } from "firebase/firestore";

// Service Imports
import { seedDefaultLabProjects } from "./labService";
import { seedDefaultAppLabApps, seedDefaultLaunchpadConfig } from "./launchpadService";
import { seedDefaultServices } from "./servicesService";
import { seedDefaultReviews } from "./reviewsService";
import { seedInitialTeam, seedFounderProfile } from "./teamService";
import { seedInitialCircular } from "./careerService";
import { seedInitialBlogs } from "./blogService";
import { resetArchiveConfigToDefault } from "./archiveService";
import { saveAvailableCurrencies } from "./currencyService";
import { DEFAULT_CURRENCIES } from "@/types/currency";
import { seedDefaultLandingConfig } from "./landingService";
import { seedDefaultNetworkHubs } from "./networkService";
import { seedDefaultUpdateLogs } from "./updateLogsService";
import { seedInitialSocialLinks } from "./socialService";
import { seedDefaultTermsConfig } from "./termsService";
import { resetPrivacyConfigToDefault } from "./privacyService";
import { resetSecurityConfigToDefault } from "./securityService";
import { resetDocumentationConfigToDefault } from "./documentationService";
import { seedDefaultLicenseConfig } from "./licenseService";
import { seedDefaultRefundConfig } from "./refundService";
import projectData from "@/data/projectData";
import { getDefaultPricingPlans, DEFAULT_YOUTUBE_URL, DEFAULT_SNAPSHOT, DEFAULT_WHATS_INCLUDED, DEFAULT_NOT_INCLUDED, DEFAULT_FAQS } from "@/types/project";

export interface SeedProgressStep {
  name: string;
  count: number;
  status: "pending" | "running" | "done" | "error";
  error?: string;
}

export interface SeedAllResults {
  totalModules: number;
  successCount: number;
  errors: { module: string; message: string }[];
  summary: Record<string, number | string>;
}

/**
 * Seeds catalog projects and tags from projectData into Firestore
 */
export async function seedCatalogProjects(): Promise<{ projects: number; tags: number }> {
  let projectCount = 0;
  const uniqueTags = new Set<string>();

  const projectEntries = Object.entries(projectData);
  for (const [slug, p] of projectEntries) {
    const rawPrice = p.price.replace(/[^0-9]/g, "");
    const rawDiscount = p.discount ? p.discount.replace(/[^0-9]/g, "") : "";

    const numPrice = parseInt(rawPrice, 10) || 10000;
    const numDiscount = parseInt(rawDiscount, 10) || Math.round(numPrice * 0.7);

    // Tags
    const tagsList = [...p.tools];
    tagsList.forEach((t) => uniqueTags.add(t));

    const activePricing = [
      {
        currency: "BDT",
        symbol: "৳",
        regularPrice: numPrice.toLocaleString("en-US"),
        discountPrice: numDiscount.toLocaleString("en-US"),
      },
      {
        currency: "USD",
        symbol: "$",
        regularPrice: Math.max(1, Math.round(numPrice / 110)).toLocaleString("en-US"),
        discountPrice: Math.max(1, Math.round(numDiscount / 110)).toLocaleString("en-US"),
      },
    ];

    const projectDoc = {
      slug,
      title: p.title,
      subtitle: p.subtitle,
      details: p.details,
      installation: p.installation,
      tools: p.tools,
      tags: tagsList,
      pricing: activePricing,
      price: numPrice.toLocaleString("en-US"),
      discount: numDiscount.toLocaleString("en-US"),
      pricingPlans: getDefaultPricingPlans({
        price: numPrice.toLocaleString("en-US"),
        discount: numDiscount.toLocaleString("en-US"),
      }),
      category: "android",
      youtubeUrl: DEFAULT_YOUTUBE_URL,
      snapshot: DEFAULT_SNAPSHOT,
      story: { idea: p.subtitle, challenge: p.details, impact: "Production-ready codebase engineered for scale." },
      whatsIncluded: DEFAULT_WHATS_INCLUDED,
      notIncluded: DEFAULT_NOT_INCLUDED,
      faqs: DEFAULT_FAQS,
      isPublic: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com",
    };

    await setDoc(doc(db, "projects", slug), projectDoc, { merge: true });
    projectCount++;
  }

  // Seed tags
  let tagCount = 0;
  for (const tagName of Array.from(uniqueTags)) {
    const tagSlug = tagName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
    await setDoc(doc(db, "tags", tagSlug), { name: tagName, slug: tagSlug }, { merge: true });
    tagCount++;
  }

  return { projects: projectCount, tags: tagCount };
}

/**
 * One-click master seeder: pushes ALL user-facing sample & default data to Firestore
 */
export async function seedAllUserSideData(
  onProgress?: (step: string, current: number, total: number) => void
): Promise<SeedAllResults> {
  const steps: { name: string; action: () => Promise<any> }[] = [
    { name: "Lab Projects (4 Active)", action: () => seedDefaultLabProjects() },
    { name: "Launchpad Applications (4 Apps)", action: () => seedDefaultAppLabApps() },
    { name: "Launchpad Configuration", action: () => seedDefaultLaunchpadConfig() },
    { name: "Services Catalog (6 Services)", action: () => seedDefaultServices() },
    { name: "Client Reviews & Trust Wall (3 Testimonials)", action: () => seedDefaultReviews() },
    { name: "Core Team & Founder Profile", action: async () => {
        await seedFounderProfile();
        return await seedInitialTeam();
      }
    },
    { name: "Career & Job Circulars (Senior UI/UX Designer)", action: () => seedInitialCircular() },
    { name: "Chronicles / Blogs (DevEngine Extreme Story)", action: () => seedInitialBlogs() },
    { name: "Archive Configuration & Case Studies", action: () => resetArchiveConfigToDefault() },
    { name: "Multi-Currency Pricing Setup", action: () => saveAvailableCurrencies(DEFAULT_CURRENCIES) },
    { name: "Landing Page Sections", action: () => seedDefaultLandingConfig() },
    { name: "Network Routing Hubs (6 Global Nodes)", action: () => seedDefaultNetworkHubs() },
    { name: "System Update Logs (5 Changelogs)", action: () => seedDefaultUpdateLogs() },
    { name: "Footer Social Channels (4 Links)", action: () => seedInitialSocialLinks() },
    { name: "Terms & Conditions Policy", action: () => seedDefaultTermsConfig() },
    { name: "Privacy Policy", action: () => resetPrivacyConfigToDefault() },
    { name: "Security Protocol", action: () => resetSecurityConfigToDefault() },
    { name: "Documentation & API Access", action: () => resetDocumentationConfigToDefault() },
    { name: "Commercial License Agreement", action: () => seedDefaultLicenseConfig() },
    { name: "Refund & Cancellation Policy", action: () => seedDefaultRefundConfig() },
    { name: "Project Catalog & Tags (6 Projects)", action: () => seedCatalogProjects() },
  ];

  const results: SeedAllResults = {
    totalModules: steps.length,
    successCount: 0,
    errors: [],
    summary: {},
  };

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    if (onProgress) {
      onProgress(step.name, i + 1, steps.length);
    }
    try {
      const res = await step.action();
      results.successCount++;
      results.summary[step.name] = res?.count ?? res ?? "Done";
    } catch (err: any) {
      console.error(`Error in seed step "${step.name}":`, err);
      results.errors.push({
        module: step.name,
        message: err?.message || "Unknown error",
      });
      results.summary[step.name] = "Failed: " + (err?.message || "Error");
    }
  }

  return results;
}
