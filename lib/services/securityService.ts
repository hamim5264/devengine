import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SecurityConfig } from "@/types/security";

const COLLECTION_NAME = "security_config";
const MAIN_DOC_ID = "main";

export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  header: {
    statusBadge: "Security Status: Verified · Zero-Trust Active",
    title: "Security Protocol",
    subtitle:
      "Zero-trust architecture and quantum-resistant encryption standards engineered to safeguard client intellectual property, infrastructure clusters, and production software deployments.",
  },
  encryption: {
    title: "Data Encryption Architecture",
    description:
      "End-to-end cryptographic shielding employing AES-256-GCM for all persisted data at rest and RSA-4096 / TLS 1.3 for active transit. Cloud Hardware Security Modules (HSM) automate cryptographic key rotation every 30 days, guaranteeing mathematical forward secrecy across all endpoints.",
    bullet1: "AES-256-GCM SYMMETRIC REST ENCRYPTION",
    bullet2: "RSA-4096 / TLS 1.3 ASYMMETRIC TRANSIT CIPHER",
    bullet3: "30-DAY AUTOMATED HSM HARDWARE KEY ROTATION",
    node1Title: "Client Ingestion Node",
    node1Desc: "Cryptographic Payload Encryption at Source",
    node1Badge: "RSA-4096 / TLS 1.3",
    node2Title: "Core Cold Vault Storage",
    node2Desc: "Zero-Knowledge Air-Gapped Persistence",
    node2Badge: "AES-256-GCM",
    diagramTitle: "End-to-End Cryptographic Transit Flow",
    diagramDesc:
      "Telemetry and source assets undergo client-side asymmetric signing, zero-knowledge transit through DevEngine HSM gateways, and envelope-encrypted persistence across multi-region cold vaults.",
  },
  infrastructure: {
    title: "Global Infrastructure Resilience",
    description:
      "Our infrastructure spans isolated Tier-4 multi-region cloud clusters. Every environment enforces rigorous SOC2 Type II, ISO 27001, and GDPR compliance standards, featuring automated DDoS mitigation and sub-millisecond automated failover.",
    cluster1Region: "EU-CENTRAL-1 (FRANKFURT BARE-METAL)",
    cluster1Badge: "SOC2 TYPE II · ISO 27001 COMPLIANT",
    cluster2Region: "US-EAST-1 (N. VIRGINIA CLUSTER)",
    cluster2Badge: "SOC2 TYPE II · FEDRAMP-READY",
    cluster3Region: "AP-SOUTHEAST-1 (SINGAPORE AIR-GAPPED)",
    cluster3Badge: "ENCRYPTED GEOGRAPHIC MIRROR",
  },
  accessControl: {
    title: "Zero-Trust Privilege Management",
    description:
      "Engineering and production environments enforce zero-standing privileges. Privileged developer access mandates hardware-backed cryptographic handshakes, multi-factor hardware security tokens (FIDO2/WebAuthn), and ephemeral credentials with auto-revocation.",
    method1Title: "FIDO2 / WebAuthn Hardware Keys",
    method1Desc:
      "Hardware-bound cryptographic challenge tokens preventing credential interception and man-in-the-middle exploits.",
    method2Title: "Continuous Biometric Verification",
    method2Desc:
      "Hardware-level biometric authorization and adaptive behavioral telemetry for all administrative actions.",
  },
};

export async function getSecurityConfig(): Promise<SecurityConfig> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      return DEFAULT_SECURITY_CONFIG;
    }

    const docSnap = snap.docs.find((d) => d.id === MAIN_DOC_ID) || snap.docs[0];
    const data = docSnap.data() as Partial<SecurityConfig>;

    return {
      header: { ...DEFAULT_SECURITY_CONFIG.header, ...(data.header || {}) },
      encryption: {
        ...DEFAULT_SECURITY_CONFIG.encryption,
        ...(data.encryption || {}),
      },
      infrastructure: {
        ...DEFAULT_SECURITY_CONFIG.infrastructure,
        ...(data.infrastructure || {}),
      },
      accessControl: {
        ...DEFAULT_SECURITY_CONFIG.accessControl,
        ...(data.accessControl || {}),
      },
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching security config from Firestore:", error);
    return DEFAULT_SECURITY_CONFIG;
  }
}

export async function updateSecurityConfig(
  newConfig: Partial<SecurityConfig>
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

export async function resetSecurityConfigToDefault(): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
  await setDoc(docRef, {
    ...DEFAULT_SECURITY_CONFIG,
    updatedAt: serverTimestamp(),
  });
}
