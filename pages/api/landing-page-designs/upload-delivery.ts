import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { ADMIN_EMAIL, getServerFirebase } from "@/lib/server/admin";
export const config = { api: { bodyParser: { sizeLimit: "25mb" } } };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Authentication is required." });
  try {
    const { auth, bucket } = getServerFirebase(); const user = await auth.verifyIdToken(token);
    if (user.email?.toLowerCase() !== ADMIN_EMAIL) return res.status(403).json({ error: "Administrator access is required." });
    const { designId, fileBase64, fileName, contentType } = req.body || {};
    if (!designId || !fileBase64 || typeof fileBase64 !== "string") return res.status(400).json({ error: "A design and delivery file are required." });
    const buffer = Buffer.from(fileBase64, "base64"); if (!buffer.length || buffer.length > 20 * 1024 * 1024) return res.status(400).json({ error: "Delivery files must be 20 MB or smaller." });
    const safeName = String(fileName || "delivery.zip").replace(/[^a-zA-Z0-9_.-]/g, "_"); const safeDesign = String(designId).replace(/[^a-zA-Z0-9_-]/g, "_");
    const key = `landing_page_deliveries/${safeDesign}/${Date.now()}_${crypto.randomUUID()}_${safeName}`;
    await bucket.file(key).save(buffer, { metadata: { contentType: String(contentType || "application/octet-stream"), cacheControl: "private, no-store" } });
    return res.status(200).json({ deliveryReference: key });
  } catch (error) { console.error("[marketplace/upload-delivery]", error); return res.status(500).json({ error: "Unable to store the protected delivery file." }); }
}
