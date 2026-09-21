import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  MaintenanceConfig,
  DEFAULT_MAINTENANCE_CONFIG,
} from "@/types/maintenance";

const SYSTEM_COLLECTION = "system_settings";
const MAINTENANCE_DOC_ID = "maintenance";

/**
 * Retrieve current maintenance configuration from Firestore
 */
export async function getMaintenanceConfig(): Promise<MaintenanceConfig> {
  try {
    const docRef = doc(db, SYSTEM_COLLECTION, MAINTENANCE_DOC_ID);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return DEFAULT_MAINTENANCE_CONFIG;
    }

    const data = snap.data() as Partial<MaintenanceConfig>;
    return {
      ...DEFAULT_MAINTENANCE_CONFIG,
      ...data,
    };
  } catch (err) {
    console.warn("Could not fetch maintenance config, using default:", err);
    return DEFAULT_MAINTENANCE_CONFIG;
  }
}

/**
 * Real-time listener for maintenance state changes.
 * Invokes callback instantly and on every update in Firestore.
 */
export function subscribeMaintenanceConfig(
  callback: (config: MaintenanceConfig) => void
): () => void {
  try {
    const docRef = doc(db, SYSTEM_COLLECTION, MAINTENANCE_DOC_ID);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<MaintenanceConfig>;
          callback({
            ...DEFAULT_MAINTENANCE_CONFIG,
            ...data,
          });
        } else {
          callback(DEFAULT_MAINTENANCE_CONFIG);
        }
      },
      (error) => {
        console.warn("Maintenance snapshot listener error:", error);
        callback(DEFAULT_MAINTENANCE_CONFIG);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn("Could not attach maintenance listener:", err);
    callback(DEFAULT_MAINTENANCE_CONFIG);
    return () => {};
  }
}

/**
 * Update maintenance configuration in Firestore
 */
export async function updateMaintenanceConfig(
  data: Partial<MaintenanceConfig>
): Promise<void> {
  const docRef = doc(db, SYSTEM_COLLECTION, MAINTENANCE_DOC_ID);
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, payload, { merge: true });
}

/**
 * Quick toggle for maintenance mode
 */
export async function setMaintenanceMode(
  isEnabled: boolean,
  targetEndTime?: string
): Promise<void> {
  const payload: Partial<MaintenanceConfig> = {
    isEnabled,
  };
  if (targetEndTime) {
    payload.targetEndTime = targetEndTime;
  }
  await updateMaintenanceConfig(payload);
}
