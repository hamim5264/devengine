export type ReviewStatus = "APPROVED" | "PENDING" | "REJECTED";

export interface ReviewRecord {
  id: string;
  reviewerName: string;
  reviewerRole?: string; // e.g., "Student Project Purchaser", "Lead Developer, TechFlow", "Creative Director"
  company?: string; // e.g., "TechFlow", "University Submission", "DevEngine Extreme"
  avatarUrl?: string; // profile picture URL or initials fallback
  rating: number; // 1 to 5
  reviewText: string;
  status: ReviewStatus;
  featured?: boolean; // If true, eligible for top cinematic carousel
  createdAt: string | any;
  updatedAt?: string | any;
  userId?: string;
  verifiedPurchase?: boolean;
}

export interface CreateReviewInput {
  reviewerName: string;
  reviewerRole?: string;
  company?: string;
  avatarUrl?: string;
  rating: number;
  reviewText: string;
  userId?: string;
}
