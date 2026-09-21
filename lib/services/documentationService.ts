import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DocumentationConfig } from "@/types/documentation";

const COLLECTION_NAME = "documentation_config";
const MAIN_DOC_ID = "main";

export const DEFAULT_DOCUMENTATION_CONFIG: DocumentationConfig = {
  header: {
    releaseBadge: "v2.4.0 Engine Released",
    title: "DevEngine",
    titleHighlight: "Documentation & API Access",
    subtitle:
      "The comprehensive guide to integrating, provisioning, and scaling client-grade architectures and automated API endpoints with the DevEngine platform.",
    lastUpdated: "September 2026",
  },
  quickStart: {
    title: "Developer Quick Start & CLI",
    terminalLabel: "bash / zsh",
    codeSnippet: `# 1. Install the DevEngine CLI globally
npm install -g @devengine/cli

# 2. Authenticate with your enterprise API Key
devengine auth login --key="de_live_948f2a1b"

# 3. Pull project environment and sync schemas
devengine project sync --id="proj_enterprise_01"

# 4. Spin up localized development server
devengine dev --port=3000 --tunnel`,
  },
  guides: {
    title: "Popular Architecture & Implementation Guides",
    guides: [
      {
        id: "components",
        icon: "category",
        title: "Component Architecture",
        description:
          "Learn how to compose complex HUD interfaces using our layered glassmorphism component system and strict prop contracts.",
        tag: "FRONTEND",
      },
      {
        id: "state",
        icon: "router",
        title: "High-Frequency State Management",
        description:
          "Handle high-frequency telemetry updates seamlessly via optimized delta pipelines without impacting visual framerates.",
        tag: "REALTIME",
      },
      {
        id: "shaders",
        icon: "animation",
        title: "GPU Shader Integration",
        description:
          "Embed real-time WebGL canvas shaders directly into background surfaces for immersive depth and reactive lighting.",
        tag: "GRAPHICS",
      },
      {
        id: "auth",
        icon: "security",
        title: "Zero-Trust Authentication",
        description:
          "Secure client applications and backend microservices using ephemeral JWT tokens, FIDO2 challenges, and HMAC request signing.",
        tag: "SECURITY",
      },
    ],
  },
  apiAccess: {
    sectionTitle: "API Access & Enterprise Integration",
    description:
      "Every project deployed through DevEngine provisions automated REST and GraphQL interfaces backed by high-throughput edge proxies, OAuth2 / API Key authentication, and real-time webhook subscriptions.",
    baseUrl: "https://api.devengine.io/v1",
    rateLimit: "10,000 requests / min (Enterprise SLA)",
    authHeader: "Authorization: Bearer <YOUR_DEVENGINE_API_KEY>",
    endpoint1Method: "GET",
    endpoint1Path: "/v1/projects/:id/telemetry",
    endpoint1Desc:
      "Query live cluster health, latency metrics, and throughput streams for active deployments.",
    endpoint2Method: "POST",
    endpoint2Path: "/v1/deployments/trigger",
    endpoint2Desc:
      "Trigger an automated zero-downtime canary or production deployment pipeline with rolling verification.",
  },
};

export async function getDocumentationConfig(): Promise<DocumentationConfig> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      return DEFAULT_DOCUMENTATION_CONFIG;
    }

    const docSnap = snap.docs.find((d) => d.id === MAIN_DOC_ID) || snap.docs[0];
    const data = docSnap.data() as Partial<DocumentationConfig>;

    return {
      header: {
        ...DEFAULT_DOCUMENTATION_CONFIG.header,
        ...(data.header || {}),
      },
      quickStart: {
        ...DEFAULT_DOCUMENTATION_CONFIG.quickStart,
        ...(data.quickStart || {}),
      },
      guides: {
        ...DEFAULT_DOCUMENTATION_CONFIG.guides,
        ...(data.guides || {}),
        guides: data.guides?.guides || DEFAULT_DOCUMENTATION_CONFIG.guides.guides,
      },
      apiAccess: {
        ...DEFAULT_DOCUMENTATION_CONFIG.apiAccess,
        ...(data.apiAccess || {}),
      },
      updatedAt: data.updatedAt,
    };
  } catch (error) {
    console.error("Error fetching documentation config from Firestore:", error);
    return DEFAULT_DOCUMENTATION_CONFIG;
  }
}

export async function updateDocumentationConfig(
  newConfig: Partial<DocumentationConfig>
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

export async function resetDocumentationConfigToDefault(): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
  await setDoc(docRef, {
    ...DEFAULT_DOCUMENTATION_CONFIG,
    updatedAt: serverTimestamp(),
  });
}
