import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/** A saved upload is always a Firebase Storage URL; errors never become local/data URLs. */
export async function uploadStorageAsset(file: File, folder: string, prefix = "asset", maxBytes = 25 * 1024 * 1024): Promise<string> {
  if (!file.size) throw new Error("Choose a non-empty file.");
  if (file.size > maxBytes) throw new Error(`File must be smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  const cleanFolder = folder.split("/").filter(Boolean).map(part => part.replace(/[^a-zA-Z0-9_.-]/g, "_")).join("/");
  const name = file.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const key = `${prefix.replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}_${crypto.randomUUID()}_${name}`;
  try {
    const result = await uploadBytes(ref(storage, `${cleanFolder}/${key}`), file, { contentType: file.type || "application/octet-stream" });
    return await getDownloadURL(result.ref);
  } catch (error) {
    // If client upload fails (e.g. storage permissions or unauthorized), attempt server-side admin upload fallback
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      const res = await fetch("/api/upload-storage-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64,
          contentType: file.type || "image/png",
          folder: cleanFolder,
          prefix,
          fileName: name,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.url) return data.url;
      }
    } catch {
      // Fall through to original error handling
    }

    const code = (error as { code?: string })?.code;
    if (code === "storage/unauthorized") throw new Error("Upload denied. Check Firebase Storage permissions.");
    if (code === "storage/bucket-not-found") throw new Error("Firebase Storage bucket is unavailable.");
    throw new Error("Upload failed. Please retry; the file has not been saved.");
  }
}
