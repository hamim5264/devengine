import React, { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { formatFileSize } from "@/lib/services/fileUploadService";
import styles from "./ImageLightboxModal.module.css";

export interface ImageLightboxProps {
  src: string | null;
  name?: string;
  size?: number;
  onClose: () => void;
}

export default function ImageLightboxModal({
  src,
  name,
  size,
  onClose,
}: ImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Lock body scroll while open
  useEffect(() => {
    if (!src) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [src]);

  // Handle ESC key to close
  useEffect(() => {
    if (!src) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [src, onClose]);

  const toggleZoom = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setZoomed((prev) => !prev);
  }, []);

  const handleDownload = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!src) return;
      try {
        const response = await fetch(src);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = name || "image";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
      } catch {
        // Fallback: direct navigation with download attribute
        const a = document.createElement("a");
        a.href = src;
        a.download = name || "image";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
    },
    [src, name]
  );

  if (!mounted || !src) return null;

  const content = (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={name || "Image preview"}
      onClick={onClose}
    >
      {/* Top Header Bar */}
      <div className={styles.topBar} onClick={(e) => e.stopPropagation()}>
        <div className={styles.fileMeta}>
          {typeof size === "number" && size > 0 && (
            <span className={styles.badge}>{formatFileSize(size)}</span>
          )}
          <span className={styles.fileName} title={name || "Image"}>
            {name || "Image preview"}
          </span>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={toggleZoom}
            title={zoomed ? "Fit to screen" : "Zoom in"}
            aria-label={zoomed ? "Fit to screen" : "Zoom in"}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              {zoomed ? "zoom_out" : "zoom_in"}
            </span>
          </button>

          <button
            type="button"
            className={styles.actionBtn}
            onClick={handleDownload}
            title="Download image"
            aria-label="Download image"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              download
            </span>
          </button>

          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.actionBtn}
            title="Open original in new tab"
            aria-label="Open original in new tab"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              open_in_new
            </span>
          </a>

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.closeBtn}`}
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              close
            </span>
          </button>
        </div>
      </div>

      {/* Main Image View Area */}
      <div
        className={`${styles.viewArea} ${zoomed ? styles.zoomed : ""}`}
        onClick={onClose}
      >
        <div className={styles.imageWrap} onClick={(e) => e.stopPropagation()}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={name || "Full screen preview"}
            className={styles.image}
            onClick={toggleZoom}
          />
        </div>

        <div className={styles.bottomHint}>
          <span>Click image to {zoomed ? "zoom out" : "zoom in"} · Click background or press Esc to close</span>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
