export type UpdateLogTag =
  | "DEPLOYED"
  | "OPTIMIZED"
  | "PATCHED"
  | "SECURITY"
  | "FEATURE";

export interface UpdateLogEntry {
  id: string;
  version: string;
  versionNumber?: string;
  title?: string;
  date: string;
  tag: UpdateLogTag | string;
  summary: string;
  bullets: string[];
  order: number;
  isPublished: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface UpdateLogFormData {
  version: string;
  date: string;
  tag: UpdateLogTag | string;
  summary: string;
  bullets: string[];
  order: number;
  isPublished: boolean;
}
