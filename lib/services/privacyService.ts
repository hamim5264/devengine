import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PrivacyConfig } from "@/types/privacy";

const COLLECTION_NAME = "privacy_config";
const MAIN_DOC_ID = "main";

export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  header: {
    badgeText: "LEGAL & TRANSPARENCY",
    lastUpdated: "August 2026",
    title: "Privacy Policy",
    subtitle:
      "Your privacy matters. Here's how DevEngine collects, uses, protects, and manages information when you use our services and products.",
  },
  overview: {
    sectionNum: "01",
    sectionTitle: "Overview",
    leadText:
      'This Privacy Policy describes how DevEngine Systems Inc. ("DevEngine," "we," "us," or "our") collects, uses, and discloses your information in connection with your use of our websites, applications, and other online products and services (collectively, the "Services").',
    subText:
      "By accessing or using our Services, you signify that you have read, understood, and agree to our collection, storage, use, and disclosure of your personal information as described in this Privacy Policy and our Terms of Service.",
    keyPrincipleTitle: "Key Principle",
    keyPrincipleText:
      "We engineer for privacy. Data minimization and secure transit are foundational to the DevEngine architecture, not afterthoughts.",
  },
  informationCollected: {
    sectionNum: "02",
    sectionTitle: "Information We Collect",
    providedIntro:
      "We collect information you provide directly to us. For example, we collect information when you create an account, participate in any interactive features of the Services, fill out a form, request customer support, or otherwise communicate with us.",
    providedItems: [
      {
        id: "account",
        title: "Account Information:",
        description: "Name, email address, password, and enterprise affiliation.",
      },
      {
        id: "billing",
        title: "Billing Information:",
        description:
          "Payment details processed securely via certified third-party vendors.",
      },
    ],
    autoTitle: "Information Collected Automatically",
    autoText:
      "When you access or use our Services, we automatically collect information about you, including telemetry data necessary for system health and performance monitoring.",
  },
  dataFlow: {
    sectionNum: "03",
    sectionTitle: "Data Flow & Security",
    introText:
      "Our infrastructure is designed to protect your data at rest and in transit using industry-standard encryption protocols.",
    node1Label: "USER CLIENT",
    node1Sub: "Encrypted Client",
    node2Label: "DEVENGINE CORE",
    node2Sub: "Zero-Knowledge Transit",
    node3Label: "SECURE STORAGE",
    node3Sub: "AES-256 Multi-Region",
  },
  cookies: {
    sectionNum: "04",
    sectionTitle: "Cookies & Tracking",
    paragraph1:
      "We use cookies, web beacons, and similar tracking technologies to track the activity on our Service and store certain information. Tracking technologies used are beacons, tags, and scripts to collect and track information and to improve and analyze our Service.",
    paragraph2:
      "You can instruct your browser to refuse all Cookies or to indicate when a Cookie is being sent. However, if you do not accept Cookies, you may not be able to use some parts of our Service.",
  },
  userRights: {
    sectionNum: "05",
    sectionTitle: "User Rights",
    introText:
      "Depending on your location, you may have certain rights regarding your personal information, such as the right to:",
    rights: [
      {
        id: "access",
        title: "Access",
        description: "Request copies of your personal data.",
      },
      {
        id: "rectification",
        title: "Rectification",
        description: "Request correction of inaccurate data.",
      },
      {
        id: "erasure",
        title: "Erasure",
        description: "Request deletion of your personal data.",
      },
      {
        id: "portability",
        title: "Portability",
        description: "Request transfer of your data to another organization.",
      },
    ],
  },
};

/**
 * Fetch Privacy Policy configuration from Firestore
 * Falls back to default if no document exists
 */
export async function getPrivacyConfig(): Promise<PrivacyConfig> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      return DEFAULT_PRIVACY_CONFIG;
    }

    const docSnap = snap.docs.find((d) => d.id === MAIN_DOC_ID) || snap.docs[0];
    const data = docSnap.data() as Partial<PrivacyConfig>;

    return {
      header: { ...DEFAULT_PRIVACY_CONFIG.header, ...(data.header || {}) },
      overview: { ...DEFAULT_PRIVACY_CONFIG.overview, ...(data.overview || {}) },
      informationCollected: {
        ...DEFAULT_PRIVACY_CONFIG.informationCollected,
        ...(data.informationCollected || {}),
        providedItems:
          data.informationCollected?.providedItems ||
          DEFAULT_PRIVACY_CONFIG.informationCollected.providedItems,
      },
      dataFlow: { ...DEFAULT_PRIVACY_CONFIG.dataFlow, ...(data.dataFlow || {}) },
      cookies: { ...DEFAULT_PRIVACY_CONFIG.cookies, ...(data.cookies || {}) },
      userRights: {
        ...DEFAULT_PRIVACY_CONFIG.userRights,
        ...(data.userRights || {}),
        rights:
          data.userRights?.rights || DEFAULT_PRIVACY_CONFIG.userRights.rights,
      },
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching privacy config from Firestore:", error);
    return DEFAULT_PRIVACY_CONFIG;
  }
}

/**
 * Save / Update Privacy Policy configuration in Firestore
 */
export async function updatePrivacyConfig(
  newConfig: Partial<PrivacyConfig>
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

/**
 * Reset Privacy Policy to Default
 */
export async function resetPrivacyConfigToDefault(): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
  await setDoc(docRef, {
    ...DEFAULT_PRIVACY_CONFIG,
    updatedAt: serverTimestamp(),
  });
}
