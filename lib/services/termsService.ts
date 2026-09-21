import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TermsConfig } from "@/types/terms";

const COLLECTION_NAME = "terms_config";
const MAIN_DOC_ID = "main";

export const DEFAULT_TERMS_CONFIG: TermsConfig = {
  header: {
    badgeText: "LEGAL AGREEMENT",
    title: "Terms & Conditions",
    subtitle:
      "The rules and responsibilities that govern your use of DevEngine products, services, software, and digital platforms.",
    lastUpdated: "August 2026",
    statusText: "TERMS ACTIVE",
  },
  agreement: {
    id: "agreement",
    number: "01",
    title: "Agreement to Terms",
    paragraphs: [
      'These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and DevEngine Systems Inc. ("Company", "we", "us", or "our"), concerning your access to and use of the website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site").',
      "You agree that by accessing the Site, you have read, understood, and agreed to be bound by all of these Terms and Conditions. IF YOU DO NOT AGREE WITH ALL OF THESE TERMS AND CONDITIONS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SITE AND YOU MUST DISCONTINUE USE IMMEDIATELY.",
    ],
  },
  eligibility: {
    id: "eligibility",
    number: "02",
    title: "Eligibility",
    paragraphs: [
      "The Site is intended for users who are at least 18 years old. Persons under the age of 18 are not permitted to use or register for the Site or use our services.",
    ],
  },
  accounts: {
    id: "accounts",
    number: "03",
    title: "User Accounts & Security",
    paragraphs: [
      "You may be required to register with the Site. You agree to keep your password confidential and will be responsible for all use of your account and password.",
      "We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.",
    ],
  },
  lifecycle: {
    title: "Software Purchases & Ownership Lifecycle",
    description:
      "The following process dictates the standard lifecycle for off-the-shelf software purchases and licenses through the DevEngine platform.",
    steps: [
      { id: "purchase", title: "PURCHASE", icon: "shopping_cart" },
      { id: "payment", title: "PAYMENT", icon: "payments" },
      { id: "delivery", title: "DELIVERY", icon: "cloud_download" },
      { id: "ownership", title: "OWNERSHIP", icon: "verified" },
      { id: "maintenance", title: "MAINTENANCE", icon: "build" },
    ],
  },
  paymentStructure: {
    title: "Custom Development Payment Structure",
    phases: [
      {
        phase: "01. INITIATION",
        description: "Project scoping, architecture planning, and environment setup.",
        obligation: "30% Upfront",
      },
      {
        phase: "02. DEVELOPMENT",
        description: "Core engineering, milestone deliveries, and iterative testing.",
        obligation: "40% Milestone Based",
      },
      {
        phase: "03. FINAL DELIVERY",
        description: "UAT approval, deployment to production, and source code transfer.",
        obligation: "30% Upon Launch",
      },
    ],
  },
  intellectualProperty: {
    title: "Intellectual Property Rights",
    devEngineOwned: [
      "Core framework code",
      "Pre-existing libraries",
      "Background operational tools",
    ],
    clientOwned: [
      "Custom business logic",
      "Brand assets & content",
      "Processed user data",
    ],
  },
};

/**
 * Fetch terms and conditions configuration with fallback
 */
export async function getTermsConfig(): Promise<TermsConfig> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      return DEFAULT_TERMS_CONFIG;
    }

    let foundData: any = null;
    snapshot.forEach((docSnap) => {
      if (docSnap.id === MAIN_DOC_ID) {
        foundData = docSnap.data();
      }
    });

    if (!foundData) {
      return DEFAULT_TERMS_CONFIG;
    }

    return {
      header: { ...DEFAULT_TERMS_CONFIG.header, ...(foundData.header || {}) },
      agreement: { ...DEFAULT_TERMS_CONFIG.agreement, ...(foundData.agreement || {}) },
      eligibility: { ...DEFAULT_TERMS_CONFIG.eligibility, ...(foundData.eligibility || {}) },
      accounts: { ...DEFAULT_TERMS_CONFIG.accounts, ...(foundData.accounts || {}) },
      lifecycle: { ...DEFAULT_TERMS_CONFIG.lifecycle, ...(foundData.lifecycle || {}) },
      paymentStructure: {
        ...DEFAULT_TERMS_CONFIG.paymentStructure,
        ...(foundData.paymentStructure || {}),
      },
      intellectualProperty: {
        ...DEFAULT_TERMS_CONFIG.intellectualProperty,
        ...(foundData.intellectualProperty || {}),
      },
    };
  } catch (err) {
    console.warn("Notice: Firestore terms_config fallback active:", err);
    return DEFAULT_TERMS_CONFIG;
  }
}

/**
 * Admin: Update terms configuration with separated fields
 */
export async function updateTermsConfig(
  data: Partial<TermsConfig>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
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
 * Admin: Seed default terms into Firestore
 */
export async function seedDefaultTermsConfig(): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
  await setDoc(docRef, {
    ...DEFAULT_TERMS_CONFIG,
    updatedAt: serverTimestamp(),
  });
}
