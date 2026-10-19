import { useState } from "react";
import type { EcoAttachment } from "@/types/staffEcoSystem";
import { formatFileSize, getFileMaterialIcon } from "@/lib/services/fileUploadService";
import ImageLightboxModal from "./ImageLightboxModal";
import styles from "./AttachmentList.module.css";

interface AttachmentListProps {
  attachments?: EcoAttachment[];
  showImagesAsThumbnails?: boolean;
}

export default function AttachmentList({
  attachments = [],
  showImagesAsThumbnails = true,
}: AttachmentListProps) {
  const [lightboxAtt, setLightboxAtt] = useState<EcoAttachment | null>(null);

  if (!attachments || attachments.length === 0) return null;

  return (
    <>
      <div className={styles.list}>
        {attachments.map((att, idx) => {
          const isImg =
            att.type?.startsWith("image/") ||
            /\.(png|jpe?g|webp|gif|svg)$/i.test(att.name);
          const isPdf =
            att.name.toLowerCase().endsWith(".pdf") || att.type?.includes("pdf");
          const iconName = getFileMaterialIcon(att.name || att.type);

          if (showImagesAsThumbnails && isImg && att.url) {
            return (
              <button
                key={att.url || `${att.name}_${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxAtt(att);
                }}
                className={styles.imageCard}
                title={`${att.name} (${formatFileSize(att.size)}) - Click to view full screen`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={att.url} alt={att.name} loading="lazy" />
                <span className={styles.imageBadge}>IMG</span>
              </button>
            );
          }

          return (
            <a
              key={att.url || `${att.name}_${idx}`}
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.item}
              title={`Download or view ${att.name}`}
            >
              <div
                className={styles.iconWrap}
                data-ext={isPdf ? "pdf" : isImg ? "image" : undefined}
              >
                <span className="material-symbols-outlined" aria-hidden="true">{iconName}</span>
              </div>
              <div className={styles.meta}>
                <span className={styles.name}>{att.name}</span>
                <span className={styles.size}>{formatFileSize(att.size)}</span>
              </div>
              <span className={`material-symbols-outlined ${styles.downloadIcon}`} aria-hidden="true">
                open_in_new
              </span>
            </a>
          );
        })}
      </div>

      <ImageLightboxModal
        src={lightboxAtt?.url || null}
        name={lightboxAtt?.name}
        size={lightboxAtt?.size}
        onClose={() => setLightboxAtt(null)}
      />
    </>
  );
}

