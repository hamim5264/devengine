export interface TeamMember {
  id: string;
  name: string;
  role: string; // e.g. "Senior Flutter Architect", "Lead AI Engineer", "UI/UX & 3D Designer"
  bio: string;
  avatarUrl: string;
  skills: string[];
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface FounderProfile {
  id?: string;
  name: string;
  title: string;
  headline: string;
  bio: string;
  avatarUrl: string;
  portfolioUrl: string;
  location: string;
  education: string;
  achievements: string[];
  techBadges: string[];
  updatedAt?: string;
}
