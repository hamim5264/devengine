import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { UpdateLogEntry, UpdateLogFormData } from "@/types/update-log";

const COLLECTION_NAME = "update_logs";

export const DEFAULT_UPDATE_LOGS: Omit<UpdateLogEntry, "id">[] = [
  {
    version: "v2.0.4 - Core Architecture Rebuild",
    versionNumber: "v2.0.4",
    title: "Core Architecture Rebuild",
    date: "2024.11.02",
    tag: "DEPLOYED",
    summary:
      "Complete overhaul of the core processing engine to support concurrent data streams with reduced latency.",
    bullets: [
      "Refactored concurrency models in processing queues.",
      "Implemented Rust-based microservices for critical path logic.",
      "Reduced memory footprint by 24% across edge nodes.",
    ],
    order: 1,
    isPublished: true,
  },
  {
    version: "v2.0.3 - Database Sharding Optimization",
    versionNumber: "v2.0.3",
    title: "Database Sharding Optimization",
    date: "2024.10.15",
    tag: "OPTIMIZED",
    summary:
      "Reconfigured database shard distribution algorithms to prevent hot-spotting during peak load events.",
    bullets: [
      "Dynamic shard reallocation based on predictive load models.",
      "Query routing latency reduced by 12ms average.",
    ],
    order: 2,
    isPublished: true,
  },
  {
    version: "v2.0.2 - Security Protocol Enhancement",
    versionNumber: "v2.0.2",
    title: "Security Protocol Enhancement",
    date: "2024.09.28",
    tag: "PATCHED",
    summary:
      "Upgraded cryptographic standards and implemented stricter zero-trust access controls across the internal network.",
    bullets: [
      "Transitioned to Quantum-Resistant Algorithms (QRA) for token generation.",
      "Automated rotation of inter-service API keys every 4 hours.",
    ],
    order: 3,
    isPublished: true,
  },
];

/**
 * Fetch published update logs for end users
 */
export async function getPublishedUpdateLogs(): Promise<UpdateLogEntry[]> {
  try {
    const logsRef = collection(db, COLLECTION_NAME);
    // Fetch documents from update_logs collection
    const snapshot = await getDocs(logsRef);

    if (snapshot.empty) {
      // Return default reference logs if collection is empty
      return DEFAULT_UPDATE_LOGS.map((item, idx) => ({
        ...item,
        id: `default-${idx}`,
      }));
    }

    const logs: UpdateLogEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.isPublished !== false) {
        logs.push({
          id: docSnap.id,
          version: data.version || "",
          versionNumber: data.versionNumber || "",
          title: data.title || "",
          date: data.date || "",
          tag: data.tag || "DEPLOYED",
          summary: data.summary || "",
          bullets: Array.isArray(data.bullets) ? data.bullets : [],
          order: typeof data.order === "number" ? data.order : 0,
          isPublished: data.isPublished !== false,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }
    });

    // In-memory sort by order asc
    logs.sort((a, b) => a.order - b.order);

    return logs.length > 0
      ? logs
      : DEFAULT_UPDATE_LOGS.map((item, idx) => ({ ...item, id: `default-${idx}` }));
  } catch (err) {
    // If Firestore rules restrict access or network is offline, return default logs gracefully without crashing
    console.warn("Firestore update_logs fetch notice (using defaults):", err);
    return DEFAULT_UPDATE_LOGS.map((item, idx) => ({
      ...item,
      id: `fallback-${idx}`,
    }));
  }
}

/**
 * Fetch all update logs for Admin management
 */
export async function getAllUpdateLogsAdmin(): Promise<UpdateLogEntry[]> {
  try {
    const logsRef = collection(db, COLLECTION_NAME);
    const q = query(logsRef, orderBy("order", "asc"));
    const snapshot = await getDocs(q);

    const logs: UpdateLogEntry[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      logs.push({
        id: docSnap.id,
        version: data.version || "",
        versionNumber: data.versionNumber || "",
        title: data.title || "",
        date: data.date || "",
        tag: data.tag || "DEPLOYED",
        summary: data.summary || "",
        bullets: Array.isArray(data.bullets) ? data.bullets : [],
        order: typeof data.order === "number" ? data.order : 0,
        isPublished: data.isPublished !== false,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    return logs;
  } catch (err) {
    console.error("Error fetching admin update logs:", err);
    throw err;
  }
}

/**
 * Create a new update log with individual separate fields in Firestore
 */
export async function createUpdateLog(
  formData: UpdateLogFormData
): Promise<string> {
  const logsRef = collection(db, COLLECTION_NAME);

  // Parse versionNumber and title from version string if applicable
  const parts = formData.version.split(" - ");
  const versionNumber = parts[0] ? parts[0].trim() : formData.version;
  const title = parts[1] ? parts.slice(1).join(" - ").trim() : "";

  const docRef = await addDoc(logsRef, {
    version: formData.version,
    versionNumber,
    title,
    date: formData.date,
    tag: formData.tag.toUpperCase(),
    summary: formData.summary,
    bullets: formData.bullets.filter((b) => b.trim().length > 0),
    order: Number(formData.order) || 0,
    isPublished: formData.isPublished !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an existing update log with separate fields
 */
export async function updateUpdateLog(
  id: string,
  formData: Partial<UpdateLogFormData>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);

  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (formData.version !== undefined) {
    payload.version = formData.version;
    const parts = formData.version.split(" - ");
    payload.versionNumber = parts[0] ? parts[0].trim() : formData.version;
    payload.title = parts[1] ? parts.slice(1).join(" - ").trim() : "";
  }
  if (formData.date !== undefined) payload.date = formData.date;
  if (formData.tag !== undefined) payload.tag = formData.tag.toUpperCase();
  if (formData.summary !== undefined) payload.summary = formData.summary;
  if (formData.bullets !== undefined) {
    payload.bullets = formData.bullets.filter((b) => b.trim().length > 0);
  }
  if (formData.order !== undefined) payload.order = Number(formData.order) || 0;
  if (formData.isPublished !== undefined) payload.isPublished = formData.isPublished;

  await updateDoc(docRef, payload);
}

/**
 * Delete an update log
 */
export async function deleteUpdateLog(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Seed initial sample logs into Firestore if not present
 */
export async function seedDefaultUpdateLogs(): Promise<void> {
  const logsRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(logsRef);
  if (!snapshot.empty) return;

  for (const item of DEFAULT_UPDATE_LOGS) {
    await addDoc(logsRef, {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
