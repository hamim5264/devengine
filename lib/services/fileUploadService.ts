import { uploadStorageAsset } from "@/lib/services/storageAssetService";
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
 * Uploads a file to the configured Firebase Storage bucket.
 */
export async function uploadFileToStorage(file: File, folder: string, prefix?: string): Promise<EcoAttachment> {
  const url = await uploadStorageAsset(file, folder || "attachments", prefix, MAX_FILE_SIZE_BYTES);
  return { name: file.name, url, size: file.size, type: file.type || "application/octet-stream" };
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
