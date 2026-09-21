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
  createdAt?: any;
  updatedAt?: any;
}
