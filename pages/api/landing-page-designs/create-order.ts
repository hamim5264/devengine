import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import FormData from "form-data";
import crypto from "node:crypto";
import { getServerFirebase } from "@/lib/server/admin";

const STORE_ID = process.env.STORE_ID;
const STORE_PASSWORD = process.env.STORE_PASSWORD;
const LIVE = process.env.SSLCOMMERZ_SANDBOX !== "true";

function originFor(req: NextApiRequest) {
  return process.env.NEXT_PUBLIC_BASE_URL || `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!STORE_ID || !STORE_PASSWORD) return res.status(503).json({ error: "Secure checkout is not configured yet." });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Sign in to continue to secure checkout." });
  try {
    const { auth, db } = getServerFirebase();
    const user = await auth.verifyIdToken(token);
    const settings = await db.collection("landing_page_settings").doc("configuration").get();
    if (settings.exists && settings.data()?.purchasesEnabled === false) return res.status(403).json({ error: "Marketplace purchases are currently unavailable." });
    const designId = typeof req.body?.designId === "string" ? req.body.designId : "";
    if (!designId) return res.status(400).json({ error: "A design is required." });
    const designRef = db.collection("landing_page_designs").doc(designId);
    const designSnap = await designRef.get();
    const design = designSnap.data();
    if (!designSnap.exists || design?.status !== "published") return res.status(404).json({ error: "This design is no longer available." });
    const amount = Number(design.price);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: "This design is not available for secure checkout." });
    const currency = String(design.currency || "BDT").toUpperCase();
    if (currency !== "BDT") return res.status(400).json({ error: "SSLCommerz checkout currently supports BDT listings only." });

    const orderRef = db.collection("landing_page_orders").doc();
    const orderNumber = `LPD-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const callback = `${originFor(req)}/api/landing-page-designs/payment-callback`;
    await orderRef.create({
      orderNumber, userId: user.uid, customerEmail: user.email || "", customerName: user.name || "Customer",
      designId: designSnap.id, designSlug: design.slug || designSnap.id, designTitle: design.title || "Landing page design",
      amount, currency, paymentProvider: "sslcommerz", paymentStatus: "pending", deliveryStatus: design.deliveryType === "none" ? "not_ready" : "ready",
      createdAt: new Date(), updatedAt: new Date(),
    });

    const form = new FormData();
    form.append("store_id", STORE_ID); form.append("store_passwd", STORE_PASSWORD);
    form.append("total_amount", amount.toFixed(2)); form.append("currency", currency); form.append("tran_id", orderRef.id);
    form.append("success_url", `${callback}?state=success`); form.append("fail_url", `${callback}?state=fail`); form.append("cancel_url", `${callback}?state=cancel`);
    form.append("cus_name", user.name || "Customer"); form.append("cus_email", user.email || "customer@devenginehq.com");
    form.append("cus_add1", "Digital delivery"); form.append("cus_city", "Dhaka"); form.append("cus_country", "Bangladesh"); form.append("cus_phone", "00000000000");
    form.append("shipping_method", "NO"); form.append("product_name", String(design.title || "Landing page design")); form.append("product_category", "Digital design"); form.append("product_profile", "general");
    const gateway = LIVE ? "https://securepay.sslcommerz.com/gwprocess/v4/api.php" : "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";
    const response = await axios.post(gateway, form, { headers: form.getHeaders(), timeout: 15000 });
    if (!response.data?.GatewayPageURL) throw new Error("Payment gateway did not create a checkout session.");
    await orderRef.update({ paymentStatus: "processing", updatedAt: new Date() });
    return res.status(200).json({ url: response.data.GatewayPageURL, orderId: orderRef.id });
  } catch (error: any) {
    console.error("[marketplace/create-order]", error?.response?.data || error?.message || error);
    return res.status(500).json({ error: "Unable to start secure checkout. Please try again." });
  }
}
