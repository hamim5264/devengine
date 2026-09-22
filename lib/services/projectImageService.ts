import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Uploads a project cover/thumbnail image.
 * Attempts Firebase Storage first; falls back to local /api/upload-image endpoint.
 */
export async function uploadProjectImage(
  file: File,
  projectSlugOrId: string = "project"
): Promise<string> {
  const cleanExt = (file.name.split(".").pop() || "png").toLowerCase();
  const filename = `${projectSlugOrId.replace(/[^a-zA-Z0-9_-]/g, "_")}_${Date.now()}.${cleanExt}`;

  // 1. Try Firebase Storage
  try {
    const storageRef = ref(storage, `projects/${filename}`);
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    if (downloadUrl) return downloadUrl;
  } catch (storageErr) {
    console.warn("[ProjectImageService] Firebase Storage upload failed, attempting fallback:", storageErr);
  }

  // 2. Fallback to API endpoint
  try {
    const base64Data = await fileToBase64(file);
    const res = await fetch("/api/upload-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filename,
        base64Data,
        folder: "projects",
      }),
    });
    const data = await res.json();
    if (res.ok && data?.url) {
      return data.url;
    }
    throw new Error(data?.error || "Upload fallback failed");
  } catch (apiErr: any) {
    console.error("[ProjectImageService] Fallback upload also failed:", apiErr);
    throw new Error(apiErr?.message || "Failed to upload project image.");
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
  });
}
