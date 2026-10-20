import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { EcoAttachment } from "@/types/staffEcoSystem";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_BATCH,
  formatFileSize,
  getFileMaterialIcon,
  uploadFileToStorage,
  validateFileSize,
} from "@/lib/services/fileUploadService";
import styles from "./AttachmentPicker.module.css";

interface AttachmentPickerProps {
  value: EcoAttachment[];
  onChange: (attachments: EcoAttachment[]) => void;
  folder?: string;
  storageFolder?: string;
  prefix?: string;
  maxFiles?: number;
  label?: string;
  hint?: string;
  disabled?: boolean;
  accept?: string;
}

export default function AttachmentPicker({
  value = [],
  onChange,
  folder,
  storageFolder,
  prefix,
  maxFiles = MAX_FILES_PER_BATCH,
  label = "Attachments (Optional)",
  hint = "PDF, images, documents (up to 10 MB, max 5)",
  disabled = false,
  accept = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt",
}: AttachmentPickerProps) {
  const targetFolder = folder || storageFolder || "attachments";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<{ id: string; name: string; size: number }[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleFiles = async (filesList: FileList | File[]) => {
    if (disabled) return;
    setErrorMsg("");

    const newFiles = Array.from(filesList);
    if (!newFiles.length) return;

    if (value.length + uploadingFiles.length + newFiles.length > maxFiles) {
      setErrorMsg(`You can attach up to ${maxFiles} files in total (currently ${value.length}).`);
      return;
    }

    // Validate size of each file
    for (const f of newFiles) {
      const check = validateFileSize(f);
      if (!check.valid) {
        setErrorMsg(check.error || "File exceeds the 10 MB limit.");
        return;
      }
    }

    // Process uploads
    const tempIds = newFiles.map((f) => ({
      id: `${Date.now()}_${Math.random()}`,
      name: f.name,
      size: f.size,
    }));
    setUploadingFiles((prev) => [...prev, ...tempIds]);

    const uploadedList: EcoAttachment[] = [];
    try {
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const tempId = tempIds[i].id;
        try {
          const uploaded = await uploadFileToStorage(file, targetFolder, prefix);
          uploadedList.push(uploaded);
        } finally {
          setUploadingFiles((prev) => prev.filter((item) => item.id !== tempId));
        }
      }
      if (uploadedList.length > 0) {
        onChange([...value, ...uploadedList]);
      }
    } catch (err) {
      console.error("[AttachmentPicker] Upload error:", err);
      setErrorMsg(err instanceof Error ? err.message : "Failed to upload file. Please try again.");
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void handleFiles(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      void handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const removeAttachment = (indexToRemove: number) => {
    onChange(value.filter((_, idx) => idx !== indexToRemove));
  };

  const canAddMore = value.length + uploadingFiles.length < maxFiles && !disabled;

  return (
    <div className={styles.container}>
      <div className={styles.labelRow}>
        <span className={styles.label}>
          <span className="material-symbols-outlined" aria-hidden="true">attach_file</span>
          {label}
        </span>
        <span className={styles.hint}>
          {value.length}/{maxFiles} · {hint}
        </span>
      </div>

      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          className={styles.dropZone}
          data-dragging={isDragging || undefined}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <div className={styles.dropZoneIcon}>
            <span className="material-symbols-outlined" aria-hidden="true">cloud_upload</span>
          </div>
          <div className={styles.dropZoneText}>
            <span className={styles.dropZonePrimary}>Click or drop files to attach</span>
            <span className={styles.dropZoneSecondary}>PDF, images, documents (up to 10 MB each)</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={accept}
            className={styles.hiddenInput}
            onChange={handleInputChange}
            disabled={disabled}
          />
        </div>
      )}

      {errorMsg && (
        <div className={styles.errorBanner} role="alert">
          <span className="material-symbols-outlined" aria-hidden="true">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      {(value.length > 0 || uploadingFiles.length > 0) && (
        <div className={styles.fileList}>
          {value.map((att, idx) => {
            const iconName = getFileMaterialIcon(att.name || att.type);
            const isPdf = att.name.toLowerCase().endsWith(".pdf") || att.type?.includes("pdf");
            const isImg = att.type?.startsWith("image/") || /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name);

            return (
              <div key={att.url || `${att.name}_${idx}`} className={styles.fileChip}>
                <div
                  className={styles.fileIcon}
                  data-ext={isPdf ? "pdf" : isImg ? "image" : undefined}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">{iconName}</span>
                </div>
                <div className={styles.fileMeta}>
                  <span className={styles.fileName} title={att.name}>{att.name}</span>
                  <span className={styles.fileSize}>{formatFileSize(att.size)}</span>
                </div>
                {!disabled && (
                  <button
                    type="button"
                    className={styles.removeButton}
                    title="Remove file"
                    aria-label={`Remove ${att.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAttachment(idx);
                    }}
                  >
                    <span className="material-symbols-outlined" aria-hidden="true">close</span>
                  </button>
                )}
              </div>
            );
          })}

          {uploadingFiles.map((up) => (
            <div key={up.id} className={styles.fileChip}>
              <div className={styles.spinner} />
              <div className={styles.fileMeta}>
                <span className={styles.fileName}>{up.name}</span>
                <span className={styles.fileSize}>Uploading… {formatFileSize(up.size)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
