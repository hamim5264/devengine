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
    const code = (error as { code?: string }).code;
    if (code === "storage/unauthorized") throw new Error("Upload denied. Check Firebase Storage permissions.");
    if (code === "storage/bucket-not-found") throw new Error("Firebase Storage bucket is unavailable.");
    throw new Error("Upload failed. Please retry; the file has not been saved.");
  }
}
