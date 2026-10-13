// pages/api/admin/seed-contracts.ts
// ─────────────────────────────────────────────────────────────
// API endpoint to populate realistic demo contracts and agreements in BDT
// ─────────────────────────────────────────────────────────────

import type { NextApiRequest, NextApiResponse } from "next";
import { seedContractCenterDemoData } from "@/lib/services/ccSeedService";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed. Use GET or POST." });
  }

  try {
    const adminEmail = (req.query.email as string) || "hamim.leon@gmail.com";
    const result = await seedContractCenterDemoData(adminEmail);

    return res.status(200).json({
      success: true,
      message: "Contract Center demo contracts and agreements populated successfully in BDT (৳)!",
      counts: result,
      details: {
        currency: "BDT (৳)",
        clients: ["Apex FinTech Solutions Ltd", "Nexus Retail & OmniLogistics Ltd"],
        quotations: ["DEV-QT-0001 (৳1,250,000 BDT)", "DEV-QT-0002 (৳780,000 BDT)"],
        agreements: ["DEV-AGR-0001 (৳1,250,000 BDT)", "DEV-AGR-0002 (৳780,000 BDT)"],
        ndas: ["DEV-NDA-0001 (Mutual)", "DEV-NDA-0002 (One-Way)"],
        changeOrders: ["DEV-CR-0001 (+৳120,000 BDT)"],
      },
    });
  } catch (error: any) {
    console.error("API Seed error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to seed Contract Center data",
      error: error?.message || String(error),
    });
  }
}
