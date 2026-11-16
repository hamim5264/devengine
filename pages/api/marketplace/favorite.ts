import type { NextApiRequest, NextApiResponse } from "next";
import { getServerFirebase } from "@/lib/server/admin";
import { FieldValue } from "firebase-admin/firestore";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { db } = getServerFirebase();
    const { designId, uid, action } = req.body || {};

    if (!designId || !uid) {
      return res.status(400).json({ error: "Design ID and User ID are required." });
    }

    const favDocId = `${uid}_${designId}`;
    const favRef = db.collection("landing_page_favorites").doc(favDocId);
    const favSnap = await favRef.get();

    // Find design doc (by ID or slug)
    let designRef = db.collection("landing_page_designs").doc(designId);
    let designSnap = await designRef.get();
    if (!designSnap.exists) {
      const q = await db.collection("landing_page_designs").where("slug", "==", designId).limit(1).get();
      if (!q.empty) {
        designRef = q.docs[0].ref;
        designSnap = q.docs[0];
      }
    }

    let isFavorite = false;

    if (action === "remove" || (action !== "add" && favSnap.exists)) {
      if (favSnap.exists) {
        await favRef.delete();
      }
      if (designSnap.exists) {
        await designRef.update({
          favoritesCount: FieldValue.increment(-1),
        }).catch(() => {});
      }
      isFavorite = false;
    } else {
      await favRef.set({
        id: favDocId,
        userId: uid,
        customerUid: uid,
        designId: designSnap.exists ? designSnap.id : designId,
        createdAt: new Date().toISOString(),
      }, { merge: true });

      if (designSnap.exists) {
        await designRef.update({
          favoritesCount: FieldValue.increment(1),
        }).catch(() => {});
      }
      isFavorite = true;
    }

    return res.status(200).json({
      success: true,
      isFavorite,
    });
  } catch (err: any) {
    console.error("[api/marketplace/favorite] Error:", err);
    return res.status(500).json({ error: err.message || "Failed to update favorite." });
  }
}
