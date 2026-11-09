import type { NextApiRequest, NextApiResponse } from "next";
import { getServerFirebase } from "@/lib/server/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { db } = getServerFirebase();
    const binCollection = db.collection("recycle_bin");

    // GET: List all items in the recycle bin
    if (req.method === "GET") {
      const snap = await binCollection.get();
      const items = snap.docs.map((d: any) => {
        const data = d.data();
        let deletedAt = data.deletedAt;
        if (deletedAt && typeof deletedAt.toDate === "function") {
          deletedAt = deletedAt.toDate().toISOString();
        }
        return {
          id: d.id,
          originalCollection: data.originalCollection || "",
          originalId: data.originalId || "",
          itemTitle: data.itemTitle || "Untitled Item",
          itemType: data.itemType || "Record",
          deletedAt,
          deletedBy: data.deletedBy || "Administrator",
          data: data.data || {},
          metadata: data.metadata || {},
        };
      });

      // Sort in memory by deletedAt descending
      items.sort((a: any, b: any) => {
        const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return dateB - dateA;
      });

      return res.status(200).json({ items });
    }

    // POST actions
    if (req.method === "POST") {
      const { action, binId, item, originalCollection, originalId, itemTitle, itemType, data, metadata, deletedBy } = req.body || {};

      // 1. Move to bin (Soft Delete)
      if (action === "move") {
        if (!originalCollection || !originalId) {
          return res.status(400).json({ error: "Missing original collection or ID" });
        }
        const newBinRef = binCollection.doc();
        const now = new Date().toISOString();
        await newBinRef.set({
          id: newBinRef.id,
          originalCollection,
          originalId,
          itemTitle: itemTitle || "Untitled Item",
          itemType: itemType || "Record",
          data: data || {},
          metadata: metadata || {},
          deletedBy: deletedBy || "Administrator",
          deletedAt: now,
        });
        await db.collection(originalCollection).doc(originalId).delete().catch(() => {});
        return res.status(200).json({ success: true, id: newBinRef.id });
      }

      // 2. Restore single item
      if (action === "restore") {
        const targetBinId = binId || item?.id;
        if (!targetBinId) return res.status(400).json({ error: "Missing bin ID" });

        const binDoc = await binCollection.doc(targetBinId).get();
        if (!binDoc.exists) return res.status(404).json({ error: "Item not found in bin" });

        const binData = binDoc.data()!;
        const targetCollection = binData.originalCollection;
        const targetId = binData.originalId;
        const restorePayload = binData.data;

        if (!targetCollection || !targetId) {
          return res.status(400).json({ error: "Invalid bin item metadata" });
        }

        const batch = db.batch();
        batch.set(db.collection(targetCollection).doc(targetId), restorePayload, { merge: true });
        batch.delete(binCollection.doc(targetBinId));
        await batch.commit();

        return res.status(200).json({ success: true });
      }

      // 3. Purge single item
      if (action === "purge") {
        if (!binId) return res.status(400).json({ error: "Missing bin ID" });
        await binCollection.doc(binId).delete();
        return res.status(200).json({ success: true });
      }

      // 4. Batch purge / Empty bin
      if (action === "empty" || action === "purgeBatch") {
        const snap = await binCollection.get();
        const batch = db.batch();
        snap.docs.forEach((doc: any) => batch.delete(doc.ref));
        await batch.commit();
        return res.status(200).json({ success: true, purgedCount: snap.docs.length });
      }

      return res.status(400).json({ error: "Invalid action" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error: any) {
    console.error("[recycle-bin API] Error:", error);
    return res.status(500).json({ error: error?.message || "Recycle bin operation failed" });
  }
}
