import { auth, db } from "@/lib/firebase";
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
    deletedBy: params.deletedBy || auth.currentUser?.email || auth.currentUser?.uid || "Unknown user",
    deletedAt: serverTimestamp(),
  };

  try {
    // 1. Save to recycle_bin
    await setDoc(binDocRef, binRecord);

    // 2. Delete from original collection
    const originalRef = doc(db, params.originalCollection, params.originalId);
    await deleteDoc(originalRef);
  } catch (clientErr) {
    // Fall back to server admin endpoint
    try {
      const res = await fetch("/api/admin/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move",
          ...params,
        }),
      });
      if (!res.ok) {
        throw new Error("Server move to bin failed");
      }
    } catch (serverErr) {
      console.error("Move to bin failed on both client and server:", clientErr, serverErr);
      throw clientErr;
    }
  }

  // 3. Log audit event
  await logActivity({
    type: "system",
    title: `Moved to Bin: ${params.itemTitle}`,
    description: `${params.itemType} "${params.itemTitle}" was sent to Recycle Bin.`,
    icon: "delete",
  }).catch(() => {});

  return binId;
}

/**
 * Fetch all items currently in the Recycle Bin
 */
export async function getBinItems(): Promise<BinItem[]> {
  // Strategy 1: Client Firestore query with deletedAt orderBy
  try {
    const q = query(collection(db, BIN_COLLECTION), orderBy("deletedAt", "desc"));
    const snap = await getDocs(q);
    if (!snap.empty) {
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
    }
  } catch (err) {
    console.warn("Client query with orderBy failed, attempting unordered collection read:", err);
  }

  // Strategy 2: Client Firestore query without orderBy (avoids index errors)
  try {
    const snap = await getDocs(collection(db, BIN_COLLECTION));
    if (!snap.empty) {
      const items = snap.docs.map((d) => {
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
      // Sort in memory
      items.sort((a, b) => {
        const tA = a.deletedAt?.seconds ? a.deletedAt.seconds * 1000 : new Date(a.deletedAt || 0).getTime();
        const tB = b.deletedAt?.seconds ? b.deletedAt.seconds * 1000 : new Date(b.deletedAt || 0).getTime();
        return tB - tA;
      });
      return items;
    }
  } catch (err) {
    console.warn("Client unordered read failed, attempting server API read:", err);
  }

  // Strategy 3: Server Admin API fallback (always succeeds regardless of client rules)
  try {
    const res = await fetch("/api/admin/recycle-bin");
    if (res.ok) {
      const json = await res.json();
      return json.items || [];
    }
  } catch (apiErr) {
    console.error("Failed to load bin items via server API:", apiErr);
  }

  return [];
}

/**
 * Restore an item from the Recycle Bin back to its original collection
 */
export async function restoreBinItem(item: BinItem): Promise<void> {
  if (!item.originalCollection || !item.originalId) {
    throw new Error("Missing original collection or ID for recovery.");
  }

  const user = auth.currentUser;
  let restored = false;

  if (user) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, "recycle_restore_intents", user.uid), { binId: item.id });
      batch.set(doc(db, item.originalCollection, item.originalId), item.data, { merge: true });
      batch.delete(doc(db, BIN_COLLECTION, item.id));
      await batch.commit();
      restored = true;
    } catch (clientErr) {
      console.warn("Client restore failed, attempting server restore fallback:", clientErr);
    }
  }

  if (!restored) {
    const res = await fetch("/api/admin/recycle-bin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", binId: item.id }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error || "Failed to restore item.");
    }
  }

  // Log recovery event
  await logActivity({
    type: "system",
    title: `Recovered: ${item.itemTitle}`,
    description: `Successfully restored ${item.itemType} back to active records.`,
    icon: "restore_from_trash",
  }).catch(() => {});
}

/**
 * Permanently purge a single item from the Recycle Bin
 */
export async function permanentlyDeleteBinItem(binId: string): Promise<void> {
  try {
    const binRef = doc(db, BIN_COLLECTION, binId);
    await deleteDoc(binRef);
  } catch (clientErr) {
    const res = await fetch("/api/admin/recycle-bin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "purge", binId }),
    });
    if (!res.ok) {
      throw clientErr;
    }
  }
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
  try {
    const res = await fetch("/api/admin/recycle-bin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "empty" }),
    });
    if (res.ok) {
      const json = await res.json();
      return json.purgedCount || 0;
    }
  } catch {}

  const items = await getBinItems();
  const ids = items.map((i) => i.id);
  return await permanentlyDeleteBatch(ids);
}
