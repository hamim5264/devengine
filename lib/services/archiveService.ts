import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { ArchiveConfig, CaseStudyContent } from "@/types/archive";

const COLLECTION_NAME = "archive_config";
const MAIN_DOC_ID = "main";

export const DEFAULT_CASE_STUDY_CONTENT: CaseStudyContent = {
  heroImage:
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1920&auto=format&fit=crop",
  challenge:
    "Building a production-grade AI chatbot that delivers contextual, multi-modal conversations while maintaining sub-second response times and a premium user experience across all platforms.",
  approach:
    "We adopted a modular, clean-architecture approach using Flutter for cross-platform rendering and Gemini API for intelligent context management. The system separates concerns into distinct layers — presentation, domain logic, and data — enabling rapid iteration and seamless scaling.",
  keyFeatures: [
    {
      title: "Multi-Modal Intelligence",
      description:
        "Processes text, images, and voice inputs through a unified Gemini pipeline, delivering contextually aware responses in real-time.",
      image:
        "https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=800&auto=format&fit=crop",
    },
    {
      title: "Cross-Platform Architecture",
      description:
        "A single Flutter codebase deploys natively to iOS, Android, and Web with pixel-perfect fidelity and platform-specific optimizations.",
      image:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
    },
    {
      title: "Real-Time State Management",
      description:
        "Riverpod-based reactive state architecture ensures instant UI updates, efficient memory usage, and predictable data flow throughout the application.",
      image:
        "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
    },
  ],
  results: [
    {
      metric: "Response Latency",
      value: "<200ms",
      description: "Average AI response time under load",
    },
    {
      metric: "Platform Coverage",
      value: "3",
      description: "iOS, Android, and Web from single codebase",
    },
    {
      metric: "Code Reduction",
      value: "60%",
      description: "Less boilerplate vs. native development",
    },
    {
      metric: "User Satisfaction",
      value: "4.8/5",
      description: "Average rating across test deployments",
    },
  ],
  technicalDeepDive:
    "The system is built on a three-tier architecture: the Presentation Layer uses Flutter widgets with Riverpod providers for reactive state management; the Domain Layer encapsulates business logic through use-cases and repository interfaces; and the Data Layer handles Firestore persistence, Gemini API communication, and local caching via Hive. Network resilience is achieved through retry policies and exponential backoff. The AI pipeline processes multi-modal inputs through a preprocessing queue before dispatching to the Gemini endpoint, with streaming responses rendered incrementally for perceived performance.",
  architectureDiagram:
    "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=1200&auto=format&fit=crop",
  gallery: [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
  ],
  testimonial: {
    quote:
      "This architecture reduced our development timeline by months. The modular design made it trivial to add new AI capabilities without touching existing features.",
    author: "Engineering Lead",
    role: "DevEngine Partner Studio",
  },
  timeline: [
    {
      phase: "Phase 1",
      title: "Research & Architecture Design",
      description:
        "Evaluated AI providers, finalized Gemini API integration strategy, and designed the clean-architecture blueprint.",
    },
    {
      phase: "Phase 2",
      title: "Core Engine Development",
      description:
        "Built the Flutter presentation layer, Riverpod state management, and Gemini API communication pipeline.",
    },
    {
      phase: "Phase 3",
      title: "Multi-Modal & Polish",
      description:
        "Integrated image and voice input processing, implemented streaming responses, and refined the premium UI.",
    },
    {
      phase: "Phase 4",
      title: "Testing & Production Deploy",
      description:
        "Comprehensive testing across platforms, performance optimization, and production deployment with CI/CD.",
    },
  ],
  ctaTitle: "Ready to Build With This Architecture?",
  ctaDescription:
    "Get the complete source code, documentation, and 6 months of priority support. Deploy your own AI-powered application in hours, not months.",
};

export const DEFAULT_ARCHIVE_CONFIG: ArchiveConfig = {
  hero: {
    badgeText: "THE PINNACLE OF DIGITAL CRAFTSMANSHIP",
    title: "Built For Ideas.",
    titleHighlight: "Engineered For Reality.",
    subtitle:
      "Explore a curated repository of high-fidelity engineering projects, ranging from AI-driven chatbots to comprehensive scalable infrastructure solutions.",
    ctaPrimaryText: "EXPLORE ARCHIVE",
    ctaSecondaryText: "VIEW LAB ECOSYSTEM",
  },
  featuredCaseStudy: {
    projectId: "dialogix-ai-intelligent-chat-assistant",
    isManual: false,
    customProjectUrl: "",
    badgeText: "FEATURED CASE STUDY",
    title: "Dialogix AI",
    titleHighlight: "Intelligent Chat Assistant",
    description:
      "A modern AI chatbot with premium UI built using Flutter & Gemini. Engineered for contextual understanding, multi-modal inputs, and seamless user experiences across devices.",
    techStack: "Flutter, Gemini API, Riverpod",
    license: "Commercial License",
    buttonText: "VIEW CASE STUDY",
    phoneImage:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop",
    caseStudyContent: DEFAULT_CASE_STUDY_CONTENT,
  },
  liveOffers: {
    badgeText: "LIVE OFFERS",
    maxVisibleOffers: 2,
    slides: [
      {
        id: "offer_1",
        projectId: "snapcaption-ai",
        tag: "AI / ML BOILERPLATE",
        title: "SnapCaption AI",
        discountBadge: "33% OFF",
        description:
          "Production-ready AI vision and automated caption generator with Gemini Vision API.",
        originalPrice: "৳ 15,000",
        offerPrice: "৳ 10,000",
        claimButtonText: "CLAIM OFFER",
        frameImage:
          "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop",
      },
      {
        id: "offer_2",
        projectId: "find-it",
        tag: "MOBILE APPLICATION",
        title: "Find It - Item Tracker",
        discountBadge: "30% OFF",
        description:
          "Real-time location-based tracking application with background geolocation alerts.",
        originalPrice: "৳ 10,000",
        offerPrice: "৳ 7,000",
        claimButtonText: "CLAIM OFFER",
        frameImage:
          "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop",
      },
      {
        id: "offer_3",
        projectId: "craftybay",
        tag: "ENTERPRISE E-COMMERCE",
        title: "CraftyBay Platform",
        discountBadge: "25% OFF",
        description:
          "High-performance multi-vendor marketplace engine with real-time payment gateway integration.",
        originalPrice: "৳ 25,000",
        offerPrice: "৳ 18,750",
        claimButtonText: "CLAIM OFFER",
        frameImage:
          "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop",
      },
    ],
  },
  lab: {
    badgeText: "CLASSIFIED DEVELOPMENT",
    title: "In The Lab",
    projectName: "Project Aurora",
    techDomain: "NEXT-GEN ANALYTICS ENGINE",
    progressPercentage: 72,
    progressStage: "DEV",
    expectedDeploy: "Q4 2026",
    targetLaunchDate: "2026-12-31T23:59:59Z",
  },
  techWall: {
    title: "Engineered With Precision",
    subtitle:
      "Built on a foundation of robust, scalable technologies designed for modern web and mobile ecosystems.",
  },
  stats: {
    stat1Value: "50+",
    stat1Label: "PROJECTS ARCHIVED",
    stat2Value: "12",
    stat2Label: "TECH DOMAINS",
    stat3Value: "10k+",
    stat3Label: "LINES OF CODE",
    stat4Value: "24/7",
    stat4Label: "ENGINEERING SUPPORT",
  },
  categories: ["android", "ios", "web", "ai", "automation"],
  defaultProjectImages: [
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop",
  ],
};

export async function getArchiveConfig(): Promise<ArchiveConfig> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      return DEFAULT_ARCHIVE_CONFIG;
    }

    const docSnap = snap.docs.find((d) => d.id === MAIN_DOC_ID) || snap.docs[0];
    const data = docSnap.data() as Partial<ArchiveConfig>;

    return {
      hero: { ...DEFAULT_ARCHIVE_CONFIG.hero, ...(data.hero || {}) },
      featuredCaseStudy: {
        ...DEFAULT_ARCHIVE_CONFIG.featuredCaseStudy,
        ...(data.featuredCaseStudy || {}),
        caseStudyContent: {
          ...DEFAULT_CASE_STUDY_CONTENT,
          ...(data.featuredCaseStudy?.caseStudyContent || {}),
          keyFeatures:
            data.featuredCaseStudy?.caseStudyContent?.keyFeatures &&
            data.featuredCaseStudy.caseStudyContent.keyFeatures.length > 0
              ? data.featuredCaseStudy.caseStudyContent.keyFeatures
              : DEFAULT_CASE_STUDY_CONTENT.keyFeatures,
          results:
            data.featuredCaseStudy?.caseStudyContent?.results &&
            data.featuredCaseStudy.caseStudyContent.results.length > 0
              ? data.featuredCaseStudy.caseStudyContent.results
              : DEFAULT_CASE_STUDY_CONTENT.results,
          gallery:
            data.featuredCaseStudy?.caseStudyContent?.gallery &&
            data.featuredCaseStudy.caseStudyContent.gallery.length > 0
              ? data.featuredCaseStudy.caseStudyContent.gallery
              : DEFAULT_CASE_STUDY_CONTENT.gallery,
          timeline:
            data.featuredCaseStudy?.caseStudyContent?.timeline &&
            data.featuredCaseStudy.caseStudyContent.timeline.length > 0
              ? data.featuredCaseStudy.caseStudyContent.timeline
              : DEFAULT_CASE_STUDY_CONTENT.timeline,
          testimonial: {
            ...DEFAULT_CASE_STUDY_CONTENT.testimonial,
            ...(data.featuredCaseStudy?.caseStudyContent?.testimonial || {}),
          },
        },
      },
      liveOffers: {
        ...DEFAULT_ARCHIVE_CONFIG.liveOffers,
        ...(data.liveOffers || {}),
        maxVisibleOffers:
          typeof data.liveOffers?.maxVisibleOffers === "number"
            ? data.liveOffers.maxVisibleOffers
            : DEFAULT_ARCHIVE_CONFIG.liveOffers.maxVisibleOffers,
        slides:
          data.liveOffers?.slides && data.liveOffers.slides.length > 0
            ? data.liveOffers.slides
            : DEFAULT_ARCHIVE_CONFIG.liveOffers.slides,
      },
      lab: { ...DEFAULT_ARCHIVE_CONFIG.lab, ...(data.lab || {}) },
      techWall: { ...DEFAULT_ARCHIVE_CONFIG.techWall, ...(data.techWall || {}) },
      stats: { ...DEFAULT_ARCHIVE_CONFIG.stats, ...(data.stats || {}) },
      categories:
        Array.isArray(data.categories) && data.categories.length > 0
          ? data.categories
          : DEFAULT_ARCHIVE_CONFIG.categories,
      defaultProjectImages:
        Array.isArray(data.defaultProjectImages) &&
        data.defaultProjectImages.length > 0
          ? data.defaultProjectImages
          : DEFAULT_ARCHIVE_CONFIG.defaultProjectImages,
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching archive config from Firestore:", error);
    return DEFAULT_ARCHIVE_CONFIG;
  }
}

export async function updateArchiveConfig(
  newConfig: Partial<ArchiveConfig>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
  await setDoc(
    docRef,
    {
      ...newConfig,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function resetArchiveConfigToDefault(): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
  await setDoc(docRef, {
    ...DEFAULT_ARCHIVE_CONFIG,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Upload an image to Firebase Storage for Archive features (e.g. Phone frame or Offer slide)
 */
export async function uploadArchiveImage(
  file: File,
  prefix: string = "archive"
): Promise<string> {
  const ext = file.name.split(".").pop();
  const filename = `${prefix}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, `archive/${filename}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

/**
 * Upload an image for Case Study content (hero, gallery, features, architecture diagram)
 */
export async function uploadCaseStudyImage(
  file: File,
  subFolder: string = "general"
): Promise<string> {
  const ext = file.name.split(".").pop();
  const filename = `casestudy_${subFolder}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, `archive/case-study/${filename}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}
