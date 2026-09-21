export type HubStatusType = "ONLINE" | "SYNCING" | "MAINTENANCE" | "DEGRADED";

export interface NetworkHub {
  id: string;
  name: string; // e.g. "North America"
  regionCode: string; // e.g. "US-EAST-1"
  uptimeText: string; // e.g. "99.99% UPTIME" or "DATA REPLICATION"
  status: HubStatusType;
  latencyMs: number;
  loadPercent: number;
  order: number;
  isOnline: boolean;
  coordinates?: { x: number; y: number }; // 0-100 relative positioning on world map
  createdAt?: any;
  updatedAt?: any;
}

export interface NetworkMetrics {
  activeNodes: number;
  totalNodes: number;
  throughput: string;
  throughputChange: string;
  packetLoss: string;
  packetLossState: string;
  avgLatencyMs: number;
}

export interface NetworkHubFormData {
  name: string;
  regionCode: string;
  uptimeText: string;
  status: HubStatusType;
  latencyMs: number;
  loadPercent: number;
  order: number;
  isOnline: boolean;
}
