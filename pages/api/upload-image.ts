import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

// 15MB limit for image uploads
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { filename, base64Data, folder = "projects" } = req.body;

    if (!base64Data) {
      return res.status(400).json({ error: "No image data provided" });
    }

    // Clean base64 header if present (e.g. data:image/png;base64,...)
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");

    // Clean filename
    const safeExt = path.extname(filename || "").toLowerCase() || ".png";
    const rawName = path
      .basename(filename || "project", safeExt)
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueName = `${rawName}_${Date.now()}${safeExt}`;

    const safeFolder = folder.replace(/[^a-zA-Z0-9_-]/g, "_");
    const uploadDir = path.join(process.cwd(), "public", "assets", "uploads", safeFolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, uniqueName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/assets/uploads/${safeFolder}/${uniqueName}`;
    return res.status(200).json({ success: true, url: publicUrl });
  } catch (err: any) {
    console.error("Upload image API error:", err);
    return res.status(500).json({ error: err.message || "Failed to upload file" });
  }
}
