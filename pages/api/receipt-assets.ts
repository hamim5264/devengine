import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

type AssetsResponse = {
  logoBase64?: string;
  signatureBase64?: string;
  error?: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AssetsResponse>
) {
  try {
    const assetsDir = path.join(process.cwd(), "assets");
    const logoPath = path.join(assetsDir, "DevEngine-logo-on-light1.png");
    const signaturePath = path.join(assetsDir, "founder_sign.png");

    let logoBase64 = "";
    let signatureBase64 = "";

    if (fs.existsSync(logoPath)) {
      const logoBuffer = fs.readFileSync(logoPath);
      logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;
    }

    if (fs.existsSync(signaturePath)) {
      const signBuffer = fs.readFileSync(signaturePath);
      signatureBase64 = `data:image/png;base64,${signBuffer.toString("base64")}`;
    }

    // Cache header for fast client repeat downloads
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    return res.status(200).json({
      logoBase64,
      signatureBase64,
    });
  } catch (err: any) {
    console.error("Failed to load receipt assets:", err);
    return res.status(500).json({ error: err.message || "Failed to load receipt assets" });
  }
}
