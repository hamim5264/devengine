export type BlogCategory =
  | "SUCCESS_STORY"
  | "ACHIEVEMENT"
  | "FAILURE_LESSON"
  | "ENGINEERING"
  | "STUDIO_CULTURE";

export type GridSpanType = "normal" | "wide" | "tall" | "hero";

export interface BlogAuthor {
  name: string;
  role: string;
  avatarUrl?: string;
}

export interface BlogStat {
  label: string;
  value: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  coverImage: string;
  author: BlogAuthor;
  readTime: string;
  featured: boolean;
  gridSpan: GridSpanType;
  tags: string[];
  stats?: BlogStat[];
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export const BLOG_CATEGORY_CONFIG: Record<
  BlogCategory,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    glowColor: string;
    icon: string;
  }
> = {
  SUCCESS_STORY: {
    label: "Success Story",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-400",
    badgeBorder: "border-emerald-500/30",
    glowColor: "rgba(16, 185, 129, 0.4)",
    icon: "trending_up",
  },
  ACHIEVEMENT: {
    label: "Milestone & Achievement",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-300",
    badgeBorder: "border-amber-500/30",
    glowColor: "rgba(245, 158, 11, 0.4)",
    icon: "military_tech",
  },
  FAILURE_LESSON: {
    label: "Failure & Hard Lessons",
    badgeBg: "bg-rose-500/15",
    badgeText: "text-rose-400",
    badgeBorder: "border-rose-500/30",
    glowColor: "rgba(244, 63, 94, 0.4)",
    icon: "warning",
  },
  ENGINEERING: {
    label: "Engineering Deep Dive",
    badgeBg: "bg-[#38f2ff]/15",
    badgeText: "text-[#38f2ff]",
    badgeBorder: "border-[#38f2ff]/30",
    glowColor: "rgba(56, 242, 255, 0.4)",
    icon: "terminal",
  },
  STUDIO_CULTURE: {
    label: "Studio Philosophy",
    badgeBg: "bg-purple-500/15",
    badgeText: "text-purple-300",
    badgeBorder: "border-purple-500/30",
    glowColor: "rgba(168, 85, 247, 0.4)",
    icon: "psychology",
  },
};
