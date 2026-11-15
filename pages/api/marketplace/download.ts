import type { NextApiRequest, NextApiResponse } from "next";
import { getServerFirebase } from "@/lib/server/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderId, token } = req.method === "GET" ? req.query : req.body;

    if (!orderId || !token) {
      return res.status(400).json({ error: "Missing order ID or authorization token." });
    }

    const { db } = getServerFirebase();
    const orderDoc = await db.collection("landing_page_orders").doc(String(orderId)).get();

    if (!orderDoc.exists) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = orderDoc.data()!;

    // Verification check
    if (order.status !== "Verified") {
      return res.status(403).json({
        error: "This order is currently pending payment verification. Downloads are granted once payment is confirmed.",
        status: order.status,
      });
    }

    // Token check
    if (order.downloadToken !== token) {
      return res.status(403).json({ error: "Invalid download access token." });
    }

    // Fetch design to get the delivery URL
    const designDoc = await db.collection("landing_page_designs").doc(order.designId).get();
    const design = designDoc.exists ? designDoc.data() : null;

    const deliveryUrl = design?.deliveryFileUrl || order.deliveryUrl || "";

    if (!deliveryUrl) {
      return res.status(404).json({
        error: "Digital asset link is being prepared by the studio. Please contact support@devenginehq.com with your Order ID.",
      });
    }

    return res.status(200).json({
      success: true,
      designTitle: order.designTitle,
      deliveryType: design?.deliveryType || "download_link",
      deliveryUrl,
      whatsIncluded: design?.whatsIncluded || [],
    });
  } catch (err: any) {
    console.error("[marketplace/download] Error:", err);
    return res.status(500).json({ error: "Could not retrieve download asset." });
  }
}
