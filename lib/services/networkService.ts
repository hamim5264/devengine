import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { NetworkHub, NetworkHubFormData, NetworkMetrics } from "@/types/network";

const COLLECTION_NAME = "network_hubs";

export const DEFAULT_NETWORK_HUBS: Omit<NetworkHub, "id">[] = [
  {
    name: "North America",
    regionCode: "US-EAST-1",
    uptimeText: "99.99% UPTIME",
    status: "ONLINE",
    latencyMs: 18,
    loadPercent: 78,
    order: 1,
    isOnline: true,
    coordinates: { x: 26, y: 36 },
  },
  {
    name: "Europe",
    regionCode: "EU-WEST-2",
    uptimeText: "99.98% UPTIME",
    status: "ONLINE",
    latencyMs: 24,
    loadPercent: 64,
    order: 2,
    isOnline: true,
    coordinates: { x: 51, y: 30 },
  },
  {
    name: "Asia Pacific",
    regionCode: "AP-SOUTH-1",
    uptimeText: "DATA REPLICATION",
    status: "SYNCING",
    latencyMs: 42,
    loadPercent: 88,
    order: 3,
    isOnline: true,
    coordinates: { x: 72, y: 48 },
  },
  {
    name: "South America",
    regionCode: "SA-EAST-1",
    uptimeText: "HARDWARE UPGRADE",
    status: "MAINTENANCE",
    latencyMs: 68,
    loadPercent: 32,
    order: 4,
    isOnline: false,
    coordinates: { x: 35, y: 72 },
  },
  {
    name: "East Asia",
    regionCode: "AP-NORTHEAST-1",
    uptimeText: "99.99% UPTIME",
    status: "ONLINE",
    latencyMs: 31,
    loadPercent: 71,
    order: 5,
    isOnline: true,
    coordinates: { x: 86, y: 38 },
  },
  {
    name: "Oceania",
    regionCode: "AP-SOUTHEAST-2",
    uptimeText: "99.95% UPTIME",
    status: "ONLINE",
    latencyMs: 58,
    loadPercent: 55,
    order: 6,
    isOnline: true,
    coordinates: { x: 88, y: 78 },
  },
];

export const DEFAULT_NETWORK_METRICS: NetworkMetrics = {
  activeNodes: 12,
  totalNodes: 14,
  throughput: "4.2 TB/s",
  throughputChange: "+12% vs last hour",
  packetLoss: "0.001%",
  packetLossState: "OPTIMAL STATE",
  avgLatencyMs: 24,
};

/**
 * Fetch network hubs for the public network topology screen
 * Gracefully falls back to default hubs if Firestore is empty or unconfigured
 */
export async function getNetworkHubs(): Promise<NetworkHub[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      return DEFAULT_NETWORK_HUBS.map((item, idx) => ({
        ...item,
        id: `default-${idx}`,
      }));
    }

    const hubs: NetworkHub[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      hubs.push({
        id: docSnap.id,
        name: data.name || "Unknown Region",
        regionCode: data.regionCode || "GLOBAL-1",
        uptimeText: data.uptimeText || "99.99% UPTIME",
        status: data.status || "ONLINE",
        latencyMs: typeof data.latencyMs === "number" ? data.latencyMs : 24,
        loadPercent: typeof data.loadPercent === "number" ? data.loadPercent : 50,
        order: typeof data.order === "number" ? data.order : 0,
        isOnline: data.isOnline !== false,
        coordinates: data.coordinates || { x: 50, y: 50 },
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    });

    // In-memory sort by order
    hubs.sort((a, b) => a.order - b.order);

    return hubs.length > 0
      ? hubs
      : DEFAULT_NETWORK_HUBS.map((item, idx) => ({ ...item, id: `default-${idx}` }));
  } catch (err) {
    console.warn("Notice: Firestore network_hubs fetch fallback active:", err);
    return DEFAULT_NETWORK_HUBS.map((item, idx) => ({
      ...item,
      id: `fallback-${idx}`,
    }));
  }
}

/**
 * Admin: Create a new Network Hub with separated individual fields
 */
export async function createNetworkHub(
  formData: NetworkHubFormData
): Promise<string> {
  const colRef = collection(db, COLLECTION_NAME);
  const docRef = await addDoc(colRef, {
    name: formData.name.trim(),
    regionCode: formData.regionCode.trim().toUpperCase(),
    uptimeText: formData.uptimeText.trim().toUpperCase(),
    status: formData.status,
    latencyMs: Number(formData.latencyMs) || 20,
    loadPercent: Number(formData.loadPercent) || 50,
    order: Number(formData.order) || 0,
    isOnline: formData.isOnline !== false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Admin: Update an existing Network Hub with separate fields
 */
export async function updateNetworkHub(
  id: string,
  formData: Partial<NetworkHubFormData>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const payload: Record<string, any> = {
    updatedAt: serverTimestamp(),
  };

  if (formData.name !== undefined) payload.name = formData.name.trim();
  if (formData.regionCode !== undefined)
    payload.regionCode = formData.regionCode.trim().toUpperCase();
  if (formData.uptimeText !== undefined)
    payload.uptimeText = formData.uptimeText.trim().toUpperCase();
  if (formData.status !== undefined) payload.status = formData.status;
  if (formData.latencyMs !== undefined) payload.latencyMs = Number(formData.latencyMs) || 0;
  if (formData.loadPercent !== undefined) payload.loadPercent = Number(formData.loadPercent) || 0;
  if (formData.order !== undefined) payload.order = Number(formData.order) || 0;
  if (formData.isOnline !== undefined) payload.isOnline = formData.isOnline;

  await updateDoc(docRef, payload);
}

/**
 * Admin: Delete a Network Hub
 */
export async function deleteNetworkHub(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Admin: Seed initial reference hubs into Firestore
 */
export async function seedDefaultNetworkHubs(): Promise<void> {
  const colRef = collection(db, COLLECTION_NAME);
  const snapshot = await getDocs(colRef);
  if (!snapshot.empty) return;

  for (const hub of DEFAULT_NETWORK_HUBS) {
    await addDoc(colRef, {
      ...hub,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
}
