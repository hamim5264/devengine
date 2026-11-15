import type { NextApiRequest, NextApiResponse } from "next";
import { getServerFirebase } from "@/lib/server/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const orderId = typeof req.query.orderId === "string" ? req.query.orderId : "";
  if (!token || !orderId) return res.status(401).json({ error: "Authentication is required." });
  try {
    const { auth, db, bucket } = getServerFirebase();
    const user = await auth.verifyIdToken(token);
    const order = await db.collection("landing_page_orders").doc(orderId).get();
    if (!order.exists || order.data()?.userId !== user.uid || order.data()?.paymentStatus !== "paid") return res.status(403).json({ error: "This delivery is unavailable." });
    const design = await db.collection("landing_page_designs").doc(order.data()!.designId).get();
    const key = design.data()?.deliveryReference;
    if (!key || typeof key !== "string" || !key.startsWith("landing_page_deliveries/")) return res.status(404).json({ error: "No secure download has been attached to this purchase." });
    const [url] = await bucket.file(key).getSignedUrl({ action: "read", expires: Date.now() + 10 * 60 * 1000, responseDisposition: "attachment" });
    await order.ref.update({ deliveryStatus: "delivered", updatedAt: new Date() });
    return res.status(200).json({ url });
  } catch (error) { console.error("[marketplace/delivery]", error); return res.status(500).json({ error: "Unable to prepare the secure download." }); }
}
