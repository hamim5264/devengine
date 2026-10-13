import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

type AssetsResponse = {
  logoBase64?: string;
  logoDarkBase64?: string;
  logoLightBase64?: string;
  signatureBase64?: string;
  error?: string;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<AssetsResponse>
) {
  try {
    const assetsDir = path.join(process.cwd(), "assets");
    const logoDarkPath = path.join(assetsDir, "DevEngine-logo-on-dark2.png");
    const logoLightPath = path.join(assetsDir, "DevEngine-logo-on-light1.png");
    const signaturePath = path.join(assetsDir, "founder_sign.png");

    let logoDarkBase64 = "";
    let logoLightBase64 = "";
    let signatureBase64 = "";

    if (fs.existsSync(logoDarkPath)) {
      const darkBuffer = fs.readFileSync(logoDarkPath);
      logoDarkBase64 = `data:image/png;base64,${darkBuffer.toString("base64")}`;
    }

    if (fs.existsSync(logoLightPath)) {
      const lightBuffer = fs.readFileSync(logoLightPath);
      logoLightBase64 = `data:image/png;base64,${lightBuffer.toString("base64")}`;
    }

    if (fs.existsSync(signaturePath)) {
      const signBuffer = fs.readFileSync(signaturePath);
      signatureBase64 = `data:image/png;base64,${signBuffer.toString("base64")}`;
    }

    // Default logoBase64 falls back to dark logo or light logo
    const logoBase64 = logoDarkBase64 || logoLightBase64;

    // Cache header for fast client repeat downloads
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    return res.status(200).json({
      logoBase64,
      logoDarkBase64,
      logoLightBase64,
      signatureBase64,
    });
  } catch (err: any) {
    console.error("Failed to load receipt assets:", err);
    return res.status(500).json({ error: err.message || "Failed to load receipt assets" });
  }
}
