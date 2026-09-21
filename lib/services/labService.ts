import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { LabProject } from "@/types/lab";

export const LAB_COLLECTION = "lab_projects";

/* ════════════════════════════════════════════════════════════════
   DEFAULT SEED DATA — shown until admin adds real projects
   ════════════════════════════════════════════════════════════════ */
export const DEFAULT_LAB_PROJECTS: LabProject[] = [
  {
    id: "project-nexus",
    slug: "project-nexus",
    title: "Project Nexus",
    tagline: "Unified cross-platform dashboard with real-time data sync.",
    description:
      "An advanced multi-tenant SaaS dashboard engine that aggregates analytics, user management, and real-time telemetry into a single unified interface. Built on Next.js 15 with WebSocket live-sync and PostgreSQL.",
    category: "Web Platform",
    status: "IN_DEVELOPMENT",
    progressPercent: 65,
    estimatedRelease: "2027-02-15",
    laptopImageUrl:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
    phoneImageUrl:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop",
    techStack: ["Next.js 15", "TypeScript", "PostgreSQL", "WebSockets", "TailwindCSS"],
    tags: ["SAAS", "REAL-TIME", "ANALYTICS"],
    icon: "hub",
    isPublic: true,
    order: 1,
  },
  {
    id: "aurora-ai",
    slug: "aurora-ai",
    title: "Aurora AI",
    tagline: "Context-aware conversational AI with agentic workflows.",
    description:
      "An intelligent agentic assistant platform combining RAG pipelines, vector search, and multi-modal reasoning. Aurora AI learns from user behavior to deliver proactive insights, automated task orchestration, and natural language querying.",
    category: "AI Engine",
    status: "ALPHA",
    progressPercent: 42,
    estimatedRelease: "2027-04-01",
    laptopImageUrl:
      "https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=800&auto=format&fit=crop",
    phoneImageUrl:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400&auto=format&fit=crop",
    techStack: ["Gemini 2.5", "LangChain", "Pinecone", "FastAPI", "Python"],
    tags: ["LLM", "RAG", "AGENTS"],
    icon: "psychology",
    isPublic: true,
    order: 2,
  },
  {
    id: "pulse-mobile",
    slug: "pulse-mobile",
    title: "Pulse Mobile",
    tagline: "120 FPS fitness & wellness tracker with biometric sync.",
    description:
      "A cross-platform Flutter health app with real-time heart rate monitoring, sleep analytics, and gamified workout challenges. Features offline-first architecture, biometric auth, and seamless wearable integration via BLE.",
    category: "Mobile App",
    status: "BETA",
    progressPercent: 82,
    estimatedRelease: "2026-12-20",
    laptopImageUrl:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
    phoneImageUrl:
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop",
    techStack: ["Flutter", "Dart", "Firebase", "Riverpod", "BLE SDK"],
    tags: ["HEALTH", "WEARABLE", "OFFLINE-FIRST"],
    icon: "favorite",
    isPublic: true,
    order: 3,
  },
  {
    id: "skynet-cloud",
    slug: "skynet-cloud",
    title: "SkyNet Cloud",
    tagline: "Automated multi-cloud orchestration & cost optimization.",
    description:
      "An infrastructure-as-code platform that auto-provisions, monitors, and optimizes cloud resources across AWS, GCP, and Azure. Features AI-driven cost forecasting, zero-trust security posture, and automated disaster recovery.",
    category: "Cloud Service",
    status: "CONCEPT",
    progressPercent: 15,
    estimatedRelease: "2027-08-01",
    laptopImageUrl:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
    phoneImageUrl:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=400&auto=format&fit=crop",
    techStack: ["Terraform", "Kubernetes", "AWS", "GCP", "Go"],
    tags: ["INFRA", "MULTI-CLOUD", "COST-OPT"],
    icon: "cloud_sync",
    isPublic: true,
    order: 4,
  },
];

/* ════════════════════════════════════════════════════════════════
   PUBLIC READS
   ════════════════════════════════════════════════════════════════ */
export async function getPublicLabProjects(): Promise<LabProject[]> {
  try {
    const q = query(
      collection(db, LAB_COLLECTION),
      orderBy("order", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as LabProject))
      .filter((p) => p.isPublic);
  } catch (err) {
    console.error("getPublicLabProjects error:", err);
    return [];
  }
}

export async function getLabProjectById(
  id: string
): Promise<LabProject | null> {
  try {
    const ref = doc(db, LAB_COLLECTION, id);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as LabProject;
  } catch (err) {
    console.error("getLabProjectById error:", err);
    return null;
  }
}

/* ════════════════════════════════════════════════════════════════
   ADMIN READS
   ════════════════════════════════════════════════════════════════ */
export async function getAllLabProjects(): Promise<LabProject[]> {
  try {
    const q = query(
      collection(db, LAB_COLLECTION),
      orderBy("order", "asc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as LabProject));
  } catch (err) {
    console.error("getAllLabProjects error:", err);
    return [];
  }
}

/* ════════════════════════════════════════════════════════════════
   ADMIN WRITES
   ════════════════════════════════════════════════════════════════ */
export async function createLabProject(
  data: Omit<LabProject, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const id =
    data.slug ||
    data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  const ref = doc(db, LAB_COLLECTION, id);
  await setDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function updateLabProject(
  id: string,
  data: Partial<LabProject>
): Promise<void> {
  const ref = doc(db, LAB_COLLECTION, id);
  const { createdAt, ...rest } = data as any;
  await setDoc(ref, { ...rest, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteLabProject(id: string): Promise<void> {
  await deleteDoc(doc(db, LAB_COLLECTION, id));
}

/**
 * Seed all default 4 Lab Projects into Firestore
 */
export async function seedDefaultLabProjects(): Promise<number> {
  let count = 0;
  for (const project of DEFAULT_LAB_PROJECTS) {
    const ref = doc(db, LAB_COLLECTION, project.id);
    await setDoc(
      ref,
      {
        ...project,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    count++;
  }
  return count;
}
