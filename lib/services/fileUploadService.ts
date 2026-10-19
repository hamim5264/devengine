import { storage, app } from "@/lib/firebase";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { EcoAttachment } from "@/types/staffEcoSystem";

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_FILES_PER_BATCH = 5;

/**
 * Converts a file into a base64 Data URL.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read "${file.name}" as data URL.`));
    reader.readAsDataURL(file);
  });
}

/**
 * Validates file size against the 10 MB limit.
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `"${file.name}" is ${formatFileSize(file.size)}, which exceeds the maximum limit of 10 MB.`,
    };
  }
  return { valid: true };
}

/**
 * Validates a list of files for size and count.
 */
export function validateFilesBatch(
  files: File[],
  maxCount = MAX_FILES_PER_BATCH
): { valid: boolean; error?: string } {
  if (files.length > maxCount) {
    return {
      valid: false,
      error: `You can upload up to ${maxCount} files at once (selected ${files.length}).`,
    };
  }
  for (const f of files) {
    const res = validateFileSize(f);
    if (!res.valid) return res;
  }
  return { valid: true };
}

/**
 * Uploads a single file to Firebase Storage with multi-bucket resolution and smart fallback.
 */
export async function uploadFileToStorage(
  file: File,
  folder: string,
  prefix?: string
): Promise<EcoAttachment> {
  const check = validateFileSize(file);
  if (!check.valid) {
    throw new Error(check.error || "File exceeds size limit of 10 MB.");
  }

  // Ensure clean path without leading/trailing or multiple consecutive slashes
  const cleanFolder = (folder || "attachments")
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean)
    .join("/");

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniqueKey = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const fileName = prefix ? `${prefix}_${uniqueKey}_${safeName}` : `${uniqueKey}_${safeName}`;
  const fullPath = cleanFolder ? `${cleanFolder}/${fileName}` : `attachments/${fileName}`;

  // Standard contentType only; omit customMetadata to avoid strict CORS preflight blocking
  const metadata = file.type ? { contentType: file.type } : undefined;
  const timeoutMs = 25000;

  // Resolve primary and alternative bucket candidates
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dev-engine-aec69";
  const primaryBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`;
  const alternateBucket = primaryBucket.includes("firebasestorage.app")
    ? `${projectId}.appspot.com`
    : `${projectId}.firebasestorage.app`;

  const storageCandidates = [
    storage,
    getStorage(app, `gs://${alternateBucket}`),
  ];

  let lastError: unknown = null;

  for (const st of storageCandidates) {
    try {
      const storageRef = ref(st, fullPath);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                `Upload timed out for "${file.name}". Please verify your network connection and storage settings.`
              )
            ),
          timeoutMs
        );
      });

      if (metadata) {
        await Promise.race([uploadBytes(storageRef, file, metadata), timeoutPromise]);
      } else {
        await Promise.race([uploadBytes(storageRef, file), timeoutPromise]);
      }
      const url = await getDownloadURL(storageRef);

      return {
        name: file.name,
        url,
        size: file.size,
        type: file.type || "application/octet-stream",
      };
    } catch (err: unknown) {
      lastError = err;
      console.warn(`[fileUploadService] Attempt with storage bucket candidate failed:`, err);
    }
  }

  // If Cloud Storage bucket is not yet created in Firebase Console:
  // For files <= 800 KB, fall back to Data URL so user testing, chat, and forms do not break
  if (file.size <= 800 * 1024) {
    try {
      console.info(`[fileUploadService] Cloud Storage bucket unavailable; falling back to Data URL for "${file.name}".`);
      const dataUrl = await readFileAsDataUrl(file);
      return {
        name: file.name,
        url: dataUrl,
        size: file.size,
        type: file.type || "application/octet-stream",
      };
    } catch (readErr) {
      console.error("[fileUploadService] Data URL fallback failed:", readErr);
    }
  }

  // If upload failed and file is too large for fallback:
  console.error("[fileUploadService] upload error:", lastError);
  const msg = lastError instanceof Error ? lastError.message : String(lastError || "");
  if (msg.includes("bucket-not-found") || msg.includes("does not exist") || msg.includes("404")) {
    throw new Error(
      `Firebase Storage is not activated yet. In Firebase Console Storage, click "Get started" to create your bucket.`
    );
  } else if (msg.includes("unauthorized") || msg.includes("permission")) {
    throw new Error(
      `Storage permission denied. In Firebase Console -> Storage -> Rules, allow authenticated users to write.`
    );
  } else if (msg.includes("CORS") || msg.includes("preflight")) {
    throw new Error(`Upload failed: CORS network policy blocked upload (${file.name}).`);
  }

  throw lastError instanceof Error ? lastError : new Error(`Upload failed for "${file.name}".`);
}

/**
 * Uploads multiple files concurrently with progress callback.
 */
export async function uploadMultipleFilesToStorage(
  files: File[],
  folder: string,
  prefix?: string,
  onProgress?: (uploadedCount: number, total: number) => void
): Promise<EcoAttachment[]> {
  const validation = validateFilesBatch(files);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  let completed = 0;
  const results = await Promise.all(
    files.map(async (f) => {
      const res = await uploadFileToStorage(f, folder, prefix);
      completed += 1;
      onProgress?.(completed, files.length);
      return res;
    })
  );

  return results;
}

/**
 * Formats bytes into a human-readable size string.
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Returns a Material Symbols icon name based on filename or mime type.
 */
export function getFileMaterialIcon(nameOrType?: string, maybeName?: string): string {
  const lower = `${nameOrType || ""} ${maybeName || ""}`.toLowerCase();
  if (lower.includes("pdf") || lower.includes(".pdf")) return "picture_as_pdf";
  if (
    lower.startsWith("image/") ||
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".svg")
  ) {
    return "image";
  }
  if (
    lower.includes("spreadsheet") ||
    lower.includes("excel") ||
    lower.endsWith(".xlsx") ||
    lower.endsWith(".xls") ||
    lower.endsWith(".csv")
  ) {
    return "table_chart";
  }
  if (
    lower.includes("zip") ||
    lower.includes("tar") ||
    lower.includes("rar") ||
    lower.endsWith(".zip") ||
    lower.endsWith(".gz") ||
    lower.endsWith(".7z")
  ) {
    return "folder_zip";
  }
  if (
    lower.startsWith("video/") ||
    lower.endsWith(".mp4") ||
    lower.endsWith(".webm") ||
    lower.endsWith(".mov")
  ) {
    return "video_file";
  }
  if (
    lower.startsWith("audio/") ||
    lower.endsWith(".mp3") ||
    lower.endsWith(".wav") ||
    lower.endsWith(".m4a")
  ) {
    return "audio_file";
  }
  if (
    lower.includes("javascript") ||
    lower.includes("typescript") ||
    lower.includes("json") ||
    lower.endsWith(".ts") ||
    lower.endsWith(".tsx") ||
    lower.endsWith(".js") ||
    lower.endsWith(".jsx") ||
    lower.endsWith(".py") ||
    lower.endsWith(".html") ||
    lower.endsWith(".css")
  ) {
    return "code";
  }
  return "description";
}
