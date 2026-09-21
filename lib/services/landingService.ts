import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import {
  LandingConfig,
  HeroConfig,
  IntroConfig,
  TechStackConfig,
  MobileConfig,
  WebPlatformConfig,
  AILabConfig,
  DefenseConfig,
  CustomSolutionsConfig,
  FeaturedProductsConfig,
  ProcessConfig,
  TestimonialsConfig,
  ContactConfig,
} from "@/types/landing";

const COLLECTION_NAME = "landing_sections";

export const DEFAULT_LANDING_CONFIG: LandingConfig = {
  hero: {
    badgeText: "Next-Gen Software Studio",
    title: "Build Software That",
    titleHighlight: "Feels Like The Future.",
    subtitle:
      "We engineer high-fidelity, performant digital ecosystems for visionary companies. From AI integration to enterprise scale.",
    stat1Value: "99.9%",
    stat1Label: "Uptime SLA",
    stat2Value: "<50ms",
    stat2Label: "Latency Avg",
    desktopImageUrl:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
    tabletImageUrl:
      "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=800&q=80",
    mobileImageUrl:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&w=600&q=80",
  },
  intro: {
    headingPrefix: "We Don't Sell Apps.",
    headingHighlight: "We Build Digital Companies.",
  },
  techStack: {
    tag: "POWERED BY",
    title: "The Modern Stack",
    techList: ["REACT", "NODE.JS", "PYTHON", "TENSORFLOW", "AWS", "KUBERNETES"],
  },
  mobile: {
    tag: "NATIVE ECOSYSTEMS",
    title: "Mobile\nExcellence.",
    description:
      "Fluid animations, offline-first architectures, and pixel-perfect UIs tailored for iOS and Android ecosystems. We build apps that feel native to the core.",
    phone1ImageUrl:
      "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?auto=format&fit=crop&w=600&q=80",
    phone2ImageUrl:
      "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?auto=format&fit=crop&w=600&q=80",
  },
  webPlatform: {
    tag: "WEB SCALE",
    title: "Enterprise Platforms",
    browserUrl: "devengine.studio/dashboard",
    screenImageUrl:
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1400&q=80",
  },
  aiLab: {
    tag: "APP LAB",
    title: "Intelligence Embedded.",
    description:
      "We integrate predictive models, computer vision, and LLMs directly into your product workflows, turning static applications into dynamic, thinking systems.",
  },
  defense: {
    tag: "DEFENSE & ACADEMIA",
    title: "Defense & Academic Precision",
    description:
      "Thesis-ready, strictly documented architectural frameworks engineered for high-security environments and university-grade evaluations. Precision at the highest level.",
  },
  customSolutions: {
    tag: "ARCHITECTURE",
    title: "Custom Solutions",
    cards: [
      {
        title: "Cloud Native Infrastructure",
        description:
          "Scalable microservices deployed on multi-cloud environments for ultimate resilience.",
        icon: "cloud_sync",
        imageUrl:
          "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
        isLarge: true,
      },
      {
        title: "Zero-Trust Security",
        description:
          "Cryptographic standards and continuous validation across distributed endpoints.",
        icon: "gpp_maybe",
        isLarge: false,
      },
      {
        title: "Real-time Analytics",
        description:
          "Telemetry pipelines processing millions of concurrent events with zero latency.",
        icon: "insights",
        isLarge: false,
      },
    ],
  },
  featuredProducts: {
    tag: "CASE STUDIES",
    title: "Featured Ecosystems",
    products: [
      {
        title: "Nexus ERP",
        description:
          "Complete business operational management system engineered for scale.",
        imageUrl:
          "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&w=1000&q=80",
        tag: "ENTERPRISE",
      },
      {
        title: "Aura Analytics",
        description:
          "Real-time data visualization and predictive insights platform.",
        imageUrl:
          "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1000&q=80",
        tag: "AI PLATFORM",
      },
    ],
  },
  process: {
    tag: "METHODOLOGY",
    title: "The Engine Process",
    stages: [
      {
        stageNumber: "STAGE 01",
        title: "Discovery & Architecture",
        description:
          "Deep dive into requirements, defining system constraints and high-level structural blueprints. We map the entire ecosystem before writing code.",
      },
      {
        stageNumber: "STAGE 02",
        title: "Cinematic Prototyping",
        description:
          "High-fidelity UI/UX design and interactive motion studies. We establish the visual language and interaction model to ensure a premium feel.",
      },
      {
        stageNumber: "STAGE 03",
        title: "Engineered Execution",
        description:
          "Agile development cycles with continuous integration, strict typing, and comprehensive testing. We build robust, scalable architectures.",
      },
      {
        stageNumber: "STAGE 04",
        title: "Rigorous Testing",
        description:
          "Automated E2E testing, penetration testing, and load simulation. We ensure the platform remains stable under extreme conditions.",
      },
      {
        stageNumber: "STAGE 05",
        title: "Deployment & Scale",
        description:
          "Zero-downtime deployment pipelines and monitoring setup. We launch the ecosystem and prepare for immediate scaling.",
      },
    ],
  },
  testimonials: {
    tag: "RECOGNITION",
    title: "Industry Acclaim",
    testimonials: [
      {
        quote:
          "DevEngine didn't just build our platform; they architected a digital experience that redefined our industry standard.",
        name: "Sarah Jenkins",
        role: "CTO at Novus Tech",
      },
      {
        quote:
          "The latency optimizations and cinematic UI design resulted in a 300% increase in user retention within the first quarter.",
        name: "Marcus Vance",
        role: "Founder of Aethra",
      },
    ],
  },
  contact: {
    tag: "COMM LINK",
    title: "Initiate Sequence.",
    subtitle: "Ready to engineer the future? Tell us about your objective.",
  },
};

/**
 * Fetch all dynamic sections for the dashboard landing page.
 * Safely merges Firestore document fields with fallback defaults.
 */
export async function getLandingConfig(): Promise<LandingConfig> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      return DEFAULT_LANDING_CONFIG;
    }

    const config: Partial<LandingConfig> = {};
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = docSnap.id as keyof LandingConfig;
      if (id in DEFAULT_LANDING_CONFIG) {
        config[id] = {
          ...DEFAULT_LANDING_CONFIG[id],
          ...data,
        } as any;
      }
    });

    return {
      hero: config.hero || DEFAULT_LANDING_CONFIG.hero,
      intro: config.intro || DEFAULT_LANDING_CONFIG.intro,
      techStack: config.techStack || DEFAULT_LANDING_CONFIG.techStack,
      mobile: config.mobile || DEFAULT_LANDING_CONFIG.mobile,
      webPlatform: config.webPlatform || DEFAULT_LANDING_CONFIG.webPlatform,
      aiLab: config.aiLab || DEFAULT_LANDING_CONFIG.aiLab,
      defense: config.defense || DEFAULT_LANDING_CONFIG.defense,
      customSolutions:
        config.customSolutions || DEFAULT_LANDING_CONFIG.customSolutions,
      featuredProducts:
        config.featuredProducts || DEFAULT_LANDING_CONFIG.featuredProducts,
      process: config.process || DEFAULT_LANDING_CONFIG.process,
      testimonials: config.testimonials || DEFAULT_LANDING_CONFIG.testimonials,
      contact: config.contact || DEFAULT_LANDING_CONFIG.contact,
    };
  } catch (err) {
    console.warn("Notice: Firestore landing config fallback active:", err);
    return DEFAULT_LANDING_CONFIG;
  }
}

/**
 * Admin: Update an individual landing section with separated first-class fields
 */
export async function updateLandingSection<K extends keyof LandingConfig>(
  sectionKey: K,
  data: Partial<LandingConfig[K]>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, sectionKey);
  await setDoc(
    docRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Admin: Upload an image file to Firebase Storage (with base64 fallback)
 */
export async function uploadLandingImage(
  file: File,
  folder = "landing"
): Promise<string> {
  try {
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const storagePath = `${folder}/${Date.now()}_${cleanFileName}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (err) {
    console.warn("Firebase Storage upload fallback triggered:", err);
    // Fallback to local DataURL so user can still preview and save images locally
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  }
}

/**
 * Admin: Seed the standard default configuration into Firestore
 */
export async function seedDefaultLandingConfig(): Promise<void> {
  const colRef = collection(db, COLLECTION_NAME);
  const keys = Object.keys(DEFAULT_LANDING_CONFIG) as (keyof LandingConfig)[];

  for (const key of keys) {
    const docRef = doc(colRef, key);
    await setDoc(docRef, {
      ...DEFAULT_LANDING_CONFIG[key],
      updatedAt: serverTimestamp(),
    });
  }
}
