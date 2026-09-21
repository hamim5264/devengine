import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { logActivity } from "./analyticsService";

export interface BinItem {
  id: string;
  originalCollection: string;
  originalId: string;
  itemTitle: string;
  itemType: string;
  deletedAt: any;
  deletedBy: string;
  data: any;
  metadata?: Record<string, any>;
}

const BIN_COLLECTION = "recycle_bin";

/**
 * Move any document to the Recycle Bin (Soft Delete)
 */
export async function moveToBin(params: {
  originalCollection: string;
  originalId: string;
  itemTitle: string;
  itemType: string;
  data: any;
  metadata?: Record<string, any>;
  deletedBy?: string;
}): Promise<string> {
  const binDocRef = doc(collection(db, BIN_COLLECTION));
  const binId = binDocRef.id;

  const binRecord = {
    id: binId,
    originalCollection: params.originalCollection,
    originalId: params.originalId,
    itemTitle: params.itemTitle,
    itemType: params.itemType,
    data: params.data,
    metadata: params.metadata || {},
    deletedBy: params.deletedBy || process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com",
    deletedAt: serverTimestamp(),
  };

  // 1. Save to recycle_bin
  await setDoc(binDocRef, binRecord);

  // 2. Delete from original collection
  const originalRef = doc(db, params.originalCollection, params.originalId);
  await deleteDoc(originalRef);

  // 3. Log audit event
  await logActivity({
    type: "system",
    title: `Moved to Bin: ${params.itemTitle}`,
    description: `${params.itemType} "${params.itemTitle}" was sent to Recycle Bin.`,
    icon: "delete",
  });

  return binId;
}

/**
 * Fetch all items currently in the Recycle Bin
 */
export async function getBinItems(): Promise<BinItem[]> {
  try {
    const q = query(collection(db, BIN_COLLECTION), orderBy("deletedAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        originalCollection: data.originalCollection || "",
        originalId: data.originalId || "",
        itemTitle: data.itemTitle || "Untitled Item",
        itemType: data.itemType || "Record",
        deletedAt: data.deletedAt,
        deletedBy: data.deletedBy || "Administrator",
        data: data.data || {},
        metadata: data.metadata || {},
      };
    });
  } catch (err) {
    console.error("Failed to load bin items:", err);
    return [];
  }
}

/**
 * Restore an item from the Recycle Bin back to its original collection
 */
export async function restoreBinItem(item: BinItem): Promise<void> {
  if (!item.originalCollection || !item.originalId) {
    throw new Error("Missing original collection or ID for recovery.");
  }

  // 1. Re-insert to original collection
  const originalRef = doc(db, item.originalCollection, item.originalId);
  await setDoc(originalRef, item.data, { merge: true });

  // 2. Remove from bin
  const binRef = doc(db, BIN_COLLECTION, item.id);
  await deleteDoc(binRef);

  // 3. Log recovery event
  await logActivity({
    type: "system",
    title: `Recovered: ${item.itemTitle}`,
    description: `Successfully restored ${item.itemType} back to active records.`,
    icon: "restore_from_trash",
  });
}

/**
 * Permanently purge a single item from the Recycle Bin
 */
export async function permanentlyDeleteBinItem(binId: string): Promise<void> {
  const binRef = doc(db, BIN_COLLECTION, binId);
  await deleteDoc(binRef);
}

/**
 * Batch restore multiple selected items
 */
export async function restoreBatch(items: BinItem[]): Promise<number> {
  let count = 0;
  for (const item of items) {
    try {
      await restoreBinItem(item);
      count++;
    } catch (err) {
      console.error(`Failed to restore item ${item.id}:`, err);
    }
  }
  return count;
}

/**
 * Batch permanently purge multiple items
 */
export async function permanentlyDeleteBatch(binIds: string[]): Promise<number> {
  let count = 0;
  for (const id of binIds) {
    try {
      await permanentlyDeleteBinItem(id);
      count++;
    } catch (err) {
      console.error(`Failed to purge item ${id}:`, err);
    }
  }
  return count;
}

/**
 * Empty the entire Recycle Bin permanently
 */
export async function emptyBin(): Promise<number> {
  const items = await getBinItems();
  const ids = items.map((i) => i.id);
  return await permanentlyDeleteBatch(ids);
}
