import { uploadStorageAsset } from "@/lib/services/storageAssetService";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Uploads a project cover/thumbnail image.
 * Persists project media in Firebase Storage.
 */
export async function uploadProjectImage(file: File, projectSlugOrId = "project"): Promise<string> {
  return uploadStorageAsset(file, "projects", projectSlugOrId);
}
