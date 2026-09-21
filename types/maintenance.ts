export interface MaintenanceProgressPhase {
  label: string;
  percent: number;
}

export interface MaintenanceConfig {
  isEnabled: boolean;
  title: string;
  badge: string;
  message: string;
  targetEndTime: string; // ISO 8601 timestamp string
  progressPercentage: number;
  progressPhases?: MaintenanceProgressPhase[];
  coreServicesStatus: string;
  databaseStatus: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_MAINTENANCE_CONFIG: MaintenanceConfig = {
  isEnabled: false,
  badge: "SYSTEM UPGRADE IN PROGRESS",
  title: "We're Building Something Better.",
  message:
    "DevEngine Core is currently undergoing scheduled maintenance to deploy V2 architectural enhancements. All services will resume shortly.",
  targetEndTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000).toISOString(),
  progressPercentage: 73,
  progressPhases: [
    { label: "ARCHITECTURE", percent: 30 },
    { label: "DATABASE", percent: 20 },
    { label: "SECURITY", percent: 23 },
    { label: "DEPLOY", percent: 27 },
  ],
  coreServicesStatus: "Updating Modules...",
  databaseStatus: "Optimizing Indexes",
  updatedAt: new Date().toISOString(),
  updatedBy: process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com",
};
