import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "node:crypto";
import { getServerFirebase } from "@/lib/server/admin";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileBase64, contentType, folder, prefix, fileName } = req.body;
    if (!fileBase64 || typeof fileBase64 !== "string") {
      return res.status(400).json({ error: "Missing file payload" });
    }

    const { bucket } = getServerFirebase();
    if (!bucket) {
      return res.status(500).json({ error: "Storage bucket not configured" });
    }

    const cleanFolder = (folder || "uploads").split("/").filter(Boolean).map((p: string) => p.replace(/[^a-zA-Z0-9_.-]/g, "_")).join("/");
    const cleanPrefix = (prefix || "asset").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeName = (fileName || "upload.png").replace(/[^a-zA-Z0-9_.-]/g, "_");
    const key = `${cleanFolder}/${cleanPrefix}_${Date.now()}_${crypto.randomUUID()}_${safeName}`;

    const buffer = Buffer.from(fileBase64, "base64");
    const fileRef = bucket.file(key);

    await fileRef.save(buffer, {
      metadata: {
        contentType: contentType || "application/octet-stream",
        cacheControl: "public, max-age=31536000",
      },
    });

    // Make public so standard HTTPS link serves anywhere
    await fileRef.makePublic().catch(() => {});

    // Standard Google Cloud / Firebase public storage link format
    const bucketName = bucket.name || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    const url = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;

    return res.status(200).json({ url });
  } catch (error: any) {
    console.error("[upload-storage-asset] Error:", error);
    return res.status(500).json({ error: error?.message || "Upload failed." });
  }
}
