import type { NextApiRequest, NextApiResponse } from "next";
import { getServerFirebase } from "@/lib/server/admin";

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const designId = clean(req.body?.designId, 120);
  const name = clean(req.body?.name, 120);
  const email = clean(req.body?.email, 254).toLowerCase();
  const message = clean(req.body?.message, 2000);
  if (!designId || !name || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Please provide your name and a valid email address." });
  try {
    const { db } = getServerFirebase();
    const design = await db.collection("landing_page_designs").doc(designId).get();
    if (!design.exists || design.data()?.status !== "published") return res.status(404).json({ error: "This design is no longer available." });
    const request = await db.collection("landing_page_purchase_requests").add({
      designId, designTitle: design.data()?.title || "Landing page design", designSlug: design.data()?.slug || designId,
      customerName: name, customerEmail: email, message, status: "new", createdAt: new Date(), updatedAt: new Date(),
    });
    await db.collection("activity_logs").add({ type: "commerce", title: `Marketplace purchase request: ${design.data()?.title || designId}`, description: `${name} requested purchase information.`, icon: "shopping_bag", createdAt: new Date() });
    return res.status(201).json({ id: request.id });
  } catch (error) { console.error("[marketplace/request-purchase]", error); return res.status(500).json({ error: "We could not send your request. Please try again." }); }
}
