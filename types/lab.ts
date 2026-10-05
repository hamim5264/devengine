export type LabProjectStatus =
  | "CONCEPT"
  | "IN_DEVELOPMENT"
  | "ALPHA"
  | "BETA"
  | "LAUNCHING_SOON";

export type LabProjectCategory =
  | "Mobile App"
  | "Web Platform"
  | "AI Engine"
  | "Cloud Service"
  | "Desktop App"
  | "IoT System"
  | string;

export interface LabProject {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  category: LabProjectCategory;
  status: LabProjectStatus;
  progressPercent: number; // 0–100
  estimatedRelease: string; // ISO date string e.g. "2026-12-01"
  laptopImageUrl: string; // Screenshot for laptop frame mockup
  phoneImageUrl: string; // Screenshot for phone frame mockup
  techStack: string[];
  tags: string[];
  icon: string; // Material Symbols icon name
  isPublic: boolean;
  order: number;
  youtubeUrl?: string; // Optional YouTube demo video URL for "Watch Demo" popup
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Extracts the 11-character YouTube video ID from various URL formats
 * (e.g., youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/..., shorts/...)
 */
export function getYouTubeVideoId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const regExp =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/)([^"&?\/\s]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return match[1];
  }
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}
