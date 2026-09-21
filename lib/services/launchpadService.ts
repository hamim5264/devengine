import { db, storage } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  LaunchpadConfig,
  LaunchpadFeaturedSlide,
  AppLabItem,
} from "@/types/launchpad";

export const COLLECTION_NAME = "launchpad_config";
export const MAIN_DOC_ID = "main";

export const DEFAULT_LAUNCHPAD_CONFIG: LaunchpadConfig = {
  overview: {
    badgeText: "EARLY ACCESS / EXPERIMENTAL",
    title: "DevEngine",
    titleHighlight: "Launchpad",
    subtitle:
      "Explore early-access apps, test new ideas, and download experimental builds for free. A cinematic showroom of engineered experiences.",
    stage: {
      leftImage:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
      centerImage:
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
      rightImage:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
      leftCaption: "Dialogix AI Assistant",
      centerCaption: "Blume Plant Tracking",
      rightCaption: "QuizCrafter Pro",
    },
  },
  featuredSlides: [
    {
      id: "slide-1",
      title: "Dialogix AI",
      subtitle: "Intelligent conversational AI",
      description:
        "A smart conversational AI assistant built with Flutter. Designed for seamless interactions, advanced context retention, and a cinematic user experience.",
      version: "v1.0.0",
      status: "LIVE",
      phoneImage:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
      googlePlayUrl: "https://play.google.com/store",
      googlePlayMessage:
        "Dialogix AI is live on Google Play! Redirecting to store listing...",
      appStoreUrl: "",
      appStoreMessage:
        "Dialogix AI for iOS is currently in Apple TestFlight review. Public App Store release is expected next month.",
    },
    {
      id: "slide-2",
      title: "Blume",
      subtitle: "Grow gently, every day.",
      description:
        "A premium plant tracking application featuring glassmorphism cards and vibrant metrics for mindful plant care.",
      version: "v1.2.0",
      status: "BETA",
      phoneImage:
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
      googlePlayUrl: "https://play.google.com/store",
      googlePlayMessage:
        "Blume Beta is available on Google Play Early Access.",
      appStoreUrl: "",
      appStoreMessage:
        "Blume iOS build is undergoing App Store certification. Sign up for early access on our community Discord.",
    },
    {
      id: "slide-3",
      title: "SnapCaption AI",
      subtitle: "Smart caption generator.",
      description:
        "Smart caption generator and context analyzer designed for video creators, marketers, and modern digital professionals.",
      version: "v1.0.0",
      status: "LIVE",
      phoneImage:
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
      googlePlayUrl: "https://play.google.com/store",
      googlePlayMessage:
        "SnapCaption AI is available now on Google Play Store.",
      appStoreUrl: "",
      appStoreMessage:
        "SnapCaption AI iOS version is currently rolling out. Coming very soon to Apple App Store!",
    },
  ],
  mobileAppSection: {
    badgeText: "DEVENGINE OFFICIAL",
    title: "The Entire Studio.",
    titleHighlight: "In Your Pocket.",
    subtitle:
      "Manage cloud projects, monitor analytics, test experimental builds, and receive real-time push deployment alerts directly on your mobile device.",
    versionInfo: "Version 1.0.0 · 45 MB · Requires Android 10+ / iOS 15+",
    googlePlayMessage:
      "DevEngine Mobile App for Android is currently in private closed alpha. Public launch is scheduled for Q4 2026. Stay tuned!",
    appStoreMessage:
      "DevEngine Mobile App for iOS is undergoing internal TestFlight testing. Official release is scheduled for Q4 2026.",
    mainPhoneImage:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
    secondaryPhoneImage:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
  },
  storeBanner: {
    headline: "Follow DevEngine on Google Play",
    description:
      "Discover our latest releases, updates, and new applications directly on Google Play. Join our community of early testers.",
    buttonText: "Visit DevEngine Store",
    buttonUrl: "https://play.google.com/store/apps/dev?id=7519161405604508020",
    buttonMessage: "DevEngine Developer Profile on Google Play will open shortly.",
  },
  categories: ["All", "AI", "Productivity", "Education", "Creative"],
};

export async function getLaunchpadConfig(): Promise<LaunchpadConfig> {
  try {
    const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as Partial<LaunchpadConfig>;
      return {
        overview: {
          ...DEFAULT_LAUNCHPAD_CONFIG.overview,
          ...(data.overview || {}),
          stage: {
            ...DEFAULT_LAUNCHPAD_CONFIG.overview.stage,
            ...(data.overview?.stage || {}),
          },
        },
        featuredSlides:
          Array.isArray(data.featuredSlides) && data.featuredSlides.length > 0
            ? data.featuredSlides
            : DEFAULT_LAUNCHPAD_CONFIG.featuredSlides,
        mobileAppSection: {
          ...DEFAULT_LAUNCHPAD_CONFIG.mobileAppSection,
          ...(data.mobileAppSection || {}),
        },
        storeBanner: {
          ...DEFAULT_LAUNCHPAD_CONFIG.storeBanner,
          ...(data.storeBanner || {}),
        },
        categories:
          Array.isArray(data.categories) && data.categories.length > 0
            ? data.categories
            : DEFAULT_LAUNCHPAD_CONFIG.categories,
        updatedAt: data.updatedAt,
      };
    }
  } catch (err) {
    console.error("Failed to load launchpad config, using default:", err);
  }

  return DEFAULT_LAUNCHPAD_CONFIG;
}

export async function updateLaunchpadConfig(
  newConfig: Partial<LaunchpadConfig>
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

export async function resetLaunchpadConfigToDefault(): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
  await setDoc(docRef, {
    ...DEFAULT_LAUNCHPAD_CONFIG,
    updatedAt: serverTimestamp(),
  });
}

export async function uploadLaunchpadImage(
  file: File,
  prefix: string = "launchpad"
): Promise<string> {
  const ext = file.name.split(".").pop();
  const filename = `${prefix}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, `launchpad/${filename}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export const DUMMY_APP_IMAGES: Record<string, string> = {
  "dialogix-ai":
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
  blume:
    "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
  "snapcaption-ai":
    "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
  "quizcrafter-pro":
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
  quizcrafter:
    "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
  default:
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
};

export function getCleanAppThumbnail(app: AppLabItem): string {
  const firstImg =
    app.images && app.images.length > 0 && typeof app.images[0] === "string"
      ? app.images[0].trim()
      : "";

  // Check if it's a broken/rate-limited Google drive link or empty
  if (
    firstImg &&
    !firstImg.includes("drive.google.com/uc") &&
    !firstImg.includes("drive.google.com/file") &&
    (firstImg.startsWith("http://") ||
      firstImg.startsWith("https://") ||
      firstImg.startsWith("/"))
  ) {
    return firstImg;
  }

  const lookupKey = (app.slug || app.id || "").toLowerCase();
  return (
    DUMMY_APP_IMAGES[lookupKey] ||
    DUMMY_APP_IMAGES[lookupKey.replace(/-pro$/, "")] ||
    DUMMY_APP_IMAGES.default
  );
}

export async function uploadAppLabImage(
  file: File,
  slugOrId: string = "app"
): Promise<string> {
  const ext = file.name.split(".").pop();
  const filename = `app_${slugOrId}_${Date.now()}.${ext}`;
  const storageRef = ref(storage, `appLab/${filename}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

export async function updateAppLabApp(
  appId: string,
  data: Partial<AppLabItem>
): Promise<void> {
  const docRef = doc(db, "appLab", appId);
  await setDoc(
    docRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function seedAppLabDummyImages(): Promise<{ updated: number }> {
  try {
    const colRef = collection(db, "appLab");
    const snap = await getDocs(colRef);
    let updated = 0;
    for (const d of snap.docs) {
      const data = d.data() as AppLabItem;
      const firstImg =
        data.images && data.images.length > 0 ? data.images[0] : "";
      const isBroken =
        !firstImg ||
        firstImg.includes("drive.google.com/uc") ||
        firstImg.includes("drive.google.com/file");

      if (isBroken) {
        const dummyImg =
          DUMMY_APP_IMAGES[d.id.toLowerCase()] ||
          DUMMY_APP_IMAGES[(data.slug || "").toLowerCase()] ||
          DUMMY_APP_IMAGES.default;

        await setDoc(
          doc(db, "appLab", d.id),
          {
            images: [dummyImg],
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        updated++;
      }
    }
    return { updated };
  } catch (err) {
    console.error("Failed to seed dummy images:", err);
    throw err;
  }
}

export async function getAppLabApps(): Promise<AppLabItem[]> {
  try {
    const colRef = collection(db, "appLab");
    const snap = await getDocs(query(colRef, where("isPublic", "==", true)));
    if (!snap.empty) {
      return snap.docs.map((d) => ({
        id: d.id,
        slug: d.id,
        ...(d.data() as any),
      }));
    }

    // Fallback if isPublic query returns empty: fetch all apps
    const allSnap = await getDocs(colRef);
    return allSnap.docs.map((d) => ({
      id: d.id,
      slug: d.id,
      ...(d.data() as any),
    }));
  } catch (err) {
    console.error("Failed to fetch appLab apps:", err);
    return [];
  }
}

export const DEFAULT_APP_LAB_ITEMS: AppLabItem[] = [
  {
    id: "dialogix-ai",
    slug: "dialogix-ai",
    name: "Dialogix AI",
    subtitle: "Intelligent conversational AI assistant",
    version: "1.0.0",
    platform: "android",
    category: "AI",
    status: "LIVE",
    description:
      "A smart conversational AI assistant built with Flutter & Gemini. Context retention, voice inputs, and rapid streaming responses.",
    images: [
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
    ],
    apkUrl: "https://drive.google.com",
    isPublic: true,
  },
  {
    id: "blume",
    slug: "blume",
    name: "Blume",
    subtitle: "Grow gently, every day.",
    version: "1.2.0",
    platform: "android",
    category: "Productivity",
    status: "BETA",
    description:
      "A premium plant tracking application featuring glassmorphism cards and vibrant metrics for mindful, daily botanical care.",
    images: [
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
    ],
    apkUrl: "https://drive.google.com",
    isPublic: true,
  },
  {
    id: "snapcaption-ai",
    slug: "snapcaption-ai",
    name: "SnapCaption AI",
    subtitle: "Smart caption generator for creators.",
    version: "1.0.0",
    platform: "android",
    category: "Creative",
    status: "LIVE",
    description:
      "Smart caption generator designed for creators and professionals. Automatic multi-language translation and tone styling.",
    images: [
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
    ],
    apkUrl: "https://drive.google.com",
    isPublic: true,
  },
  {
    id: "quizcrafter-pro",
    slug: "quizcrafter-pro",
    name: "QuizCrafter Pro",
    subtitle: "Adaptive quiz & testing engine.",
    version: "2.1.0",
    platform: "web",
    category: "Education",
    status: "BETA",
    description:
      "Modern interactive quiz platform with dynamic time trials, question randomization, and comprehensive knowledge analytics.",
    images: [
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
    ],
    apkUrl: "https://drive.google.com",
    isPublic: true,
  },
];

/**
 * Seed all default 4 Launchpad/AppLab applications into Firestore
 */
export async function seedDefaultAppLabApps(): Promise<number> {
  let count = 0;
  for (const app of DEFAULT_APP_LAB_ITEMS) {
    const docRef = doc(db, "appLab", app.id);
    await setDoc(
      docRef,
      {
        ...app,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    count++;
  }
  return count;
}

/**
 * Seed or restore full Launchpad configuration to Firestore
 */
export async function seedDefaultLaunchpadConfig(): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
  await setDoc(docRef, {
    ...DEFAULT_LAUNCHPAD_CONFIG,
    updatedAt: serverTimestamp(),
  });
}

