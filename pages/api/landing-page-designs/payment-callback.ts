import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { getServerFirebase } from "@/lib/server/admin";

const STORE_ID = process.env.STORE_ID;
const STORE_PASSWORD = process.env.STORE_PASSWORD;
const LIVE = process.env.SSLCOMMERZ_SANDBOX !== "true";
const resultUrl = (req: NextApiRequest, orderId: string, state: string) => `${process.env.NEXT_PUBLIC_BASE_URL || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`}/landing-page-designs/orders/${encodeURIComponent(orderId)}?payment=${state}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = req.method === "POST" ? req.body : req.query;
  const orderId = typeof body.tran_id === "string" ? body.tran_id : "";
  const requestedState = typeof req.query.state === "string" ? req.query.state : "unknown";
  if (!orderId) return res.status(400).send("Missing transaction reference.");
  try {
    const { db } = getServerFirebase();
    const orderRef = db.collection("landing_page_orders").doc(orderId);
    const order = await orderRef.get();
    if (!order.exists) return res.status(404).send("Order not found.");
    if (requestedState !== "success" || !body.val_id || !STORE_ID || !STORE_PASSWORD) {
      await orderRef.update({ paymentStatus: requestedState === "cancel" ? "cancelled" : "failed", updatedAt: new Date() });
      return res.redirect(303, resultUrl(req, orderId, requestedState));
    }
    const validationBase = LIVE ? "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php" : "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php";
    const validation = await axios.get(validationBase, { params: { val_id: body.val_id, store_id: STORE_ID, store_passwd: STORE_PASSWORD, format: "json" }, timeout: 15000 });
    const verified = validation.data?.status === "VALID" || validation.data?.status === "VALIDATED";
    const expected = order.data()!;
    const paidAmount = Number(validation.data?.amount);
    if (!verified || validation.data?.tran_id !== orderId || !Number.isFinite(paidAmount) || paidAmount !== Number(expected.amount) || validation.data?.currency !== expected.currency) {
      await orderRef.update({ paymentStatus: "failed", updatedAt: new Date() });
      return res.redirect(303, resultUrl(req, orderId, "failed"));
    }
    await db.runTransaction(async (transaction) => {
      const current = await transaction.get(orderRef);
      if (!current.exists || current.data()?.paymentStatus === "paid") return;
      const designRef = db.collection("landing_page_designs").doc(expected.designId);
      const design = await transaction.get(designRef);
      transaction.update(orderRef, { paymentStatus: "paid", deliveryStatus: expected.deliveryStatus === "ready" ? "ready" : "not_ready", transactionId: validation.data?.bank_tran_id || validation.data?.tran_id, providerValidationId: body.val_id, paidAt: new Date(), updatedAt: new Date() });
      if (design.exists) transaction.update(designRef, { totalSales: (Number(design.data()?.totalSales) || 0) + 1, updatedAt: new Date() });
    });
    return res.redirect(303, resultUrl(req, orderId, "verified"));
  } catch (error) {
    console.error("[marketplace/payment-callback]", error);
    return res.redirect(303, resultUrl(req, orderId, "review"));
  }
}
