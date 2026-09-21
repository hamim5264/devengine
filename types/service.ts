export interface DevEngineService {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  category: "Web Architecture" | "Mobile Engineering" | "AI & Machine Learning" | "Cloud & DevOps" | "Enterprise Systems" | string;
  icon: string; // Material symbol or identifier (e.g., "layers", "smartphone", "psychology", "cloud_sync", "palette", "terminal")
  badge: string; // e.g. "ENTERPRISE GRADE", "EXPEDITED DELIVERY", "99.99% SLA"
  description: string;
  deliverables: string[];
  techStack: string[];
  timeline: string; // e.g. "2-4 Weeks Sprint", "Custom Pod"
  isPublic: boolean;
  order: number;
  imageUrl?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface ServiceInquiry {
  id: string;
  serviceId?: string;
  serviceTitle?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  projectDetails: string;
  budgetRange?: string;
  estimatedTimeline?: string;
  createdAt?: any;
  status?: "NEW" | "IN_REVIEW" | "CONTACTED" | "RESOLVED";
}
