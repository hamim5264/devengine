import type { NextApiRequest, NextApiResponse } from "next";
import { getServerFirebase } from "@/lib/server/admin";
import crypto from "node:crypto";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { db } = getServerFirebase();
    const {
      designId,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      paymentMethod,
      transactionId,
      senderNumberOrAccount,
      customerUid,
    } = req.body || {};

    if (!designId || !customerName || !customerEmail || !paymentMethod) {
      return res.status(400).json({ error: "Missing required order information." });
    }

    // 1. Fetch the design from database to ensure authentic price
    const designRef = db.collection("landing_page_designs").doc(designId);
    const designSnap = await designRef.get();
    if (!designSnap.exists) {
      return res.status(404).json({ error: "Design not found in marketplace." });
    }

    const design = designSnap.data()!;
    if (design.status !== "published") {
      return res.status(400).json({ error: "This design is not currently available for purchase." });
    }

    const price = Number(design.price) || 0;
    const isFree = Boolean(design.isFree) || price === 0;

    // Generate unique order ID
    const year = new Date().getFullYear();
    const randomHex = crypto.randomBytes(3).toString("hex").toUpperCase();
    const orderId = `LPD-${year}-${randomHex}`;

    const now = new Date().toISOString();
    const orderRecord = {
      id: orderId,
      designId: design.id,
      designTitle: design.title,
      designSlug: design.slug,
      thumbnailUrl: design.thumbnailUrl || "",
      amount: price,
      currency: design.currency || "USD",

      customerUid: customerUid || "",
      customerName: String(customerName).trim(),
      customerEmail: String(customerEmail).trim().toLowerCase(),
      customerPhone: String(customerPhone || "").trim(),
      customerAddress: String(customerAddress || "").trim(),

      paymentMethod: isFree ? "Free" : paymentMethod,
      transactionId: isFree ? "FREE_DOWNLOAD" : String(transactionId || "").trim(),
      senderNumberOrAccount: String(senderNumberOrAccount || "").trim(),

      status: isFree ? "Verified" : "Pending Verification",
      deliveryStatus: isFree ? "Delivered" : "Pending",
      downloadToken: isFree ? crypto.randomUUID() : "",
      deliveryUrl: isFree ? (design.deliveryFileUrl || "") : "",

      createdAt: now,
      updatedAt: now,
    };

    await db.collection("landing_page_orders").doc(orderId).set(orderRecord);

    // If free, increment sales count immediately
    if (isFree) {
      await designRef.update({
        salesCount: (design.salesCount || 0) + 1,
      }).catch(() => {});
    }

    return res.status(200).json({
      success: true,
      order: orderRecord,
      message: isFree
        ? "Your free download is ready!"
        : "Order submitted successfully! Our team will verify your transaction shortly.",
    });
  } catch (err: any) {
    console.error("[marketplace/order] Error:", err);
    return res.status(500).json({ error: err?.message || "Failed to process order." });
  }
}
