export type DefaultBlogCategory =
  | "SUCCESS_STORY"
  | "ACHIEVEMENT"
  | "FAILURE_LESSON"
  | "ENGINEERING"
  | "STUDIO_CULTURE";

export type BlogCategory = DefaultBlogCategory | (string & {});

export type GridSpanType =
  | "normal"
  | "wide"
  | "tall"
  | "hero"
  | "split"
  | "quad"
  | "spotlight"
  | "compact"
  | "overlay"
  | "strip";

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
  pinned?: boolean;
  gridSpan: GridSpanType;
  tags: string[];
  stats?: BlogStat[];
  order?: number;
  views?: number;
  readsCount?: number;
  isPublished: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogCategoryConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  glowColor: string;
  icon: string;
}

export interface BlogCategoryItem {
  id: string;
  label: string;
  icon: string;
  badgeBg?: string;
  badgeText?: string;
  badgeBorder?: string;
  glowColor?: string;
  colorTheme?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export const BLOG_CATEGORY_CONFIG: Record<
  DefaultBlogCategory,
  BlogCategoryConfig
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
    badgeBg: "bg-[#2cecf7]/15",
    badgeText: "text-[#2cecf7]",
    badgeBorder: "border-[#2cecf7]/30",
    glowColor: "rgba(44, 236, 247, 0.4)",
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

/**
 * Helper to safely extract category styling and labels for both defaults and custom categories
 */
export function getBlogCategoryDetails(
  categoryKey: string,
  customCategories?: BlogCategoryItem[]
): BlogCategoryConfig {
  if (categoryKey in BLOG_CATEGORY_CONFIG) {
    return BLOG_CATEGORY_CONFIG[categoryKey as DefaultBlogCategory];
  }

  if (customCategories && customCategories.length > 0) {
    const found = customCategories.find(
      (c) =>
        c.id.toLowerCase() === categoryKey.toLowerCase() ||
        c.label.toLowerCase() === categoryKey.toLowerCase()
    );
    if (found) {
      return {
        label: found.label,
        badgeBg: found.badgeBg || "bg-[#2cecf7]/15",
        badgeText: found.badgeText || "text-[#2cecf7]",
        badgeBorder: found.badgeBorder || "border-[#2cecf7]/30",
        glowColor: found.glowColor || "rgba(44, 236, 247, 0.4)",
        icon: found.icon || "label",
      };
    }
  }

  // Fallback heuristic for any custom category string
  const cleanLabel = categoryKey
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const palettes = [
    { badgeBg: "bg-[#2cecf7]/15", badgeText: "text-[#2cecf7]", badgeBorder: "border-[#2cecf7]/30", glowColor: "rgba(44, 236, 247, 0.4)", icon: "terminal" },
    { badgeBg: "bg-emerald-500/15", badgeText: "text-emerald-400", badgeBorder: "border-emerald-500/30", glowColor: "rgba(16, 185, 129, 0.4)", icon: "trending_up" },
    { badgeBg: "bg-purple-500/15", badgeText: "text-purple-300", badgeBorder: "border-purple-500/30", glowColor: "rgba(168, 85, 247, 0.4)", icon: "psychology" },
    { badgeBg: "bg-amber-500/15", badgeText: "text-amber-300", badgeBorder: "border-amber-500/30", glowColor: "rgba(245, 158, 11, 0.4)", icon: "military_tech" },
    { badgeBg: "bg-rose-500/15", badgeText: "text-rose-400", badgeBorder: "border-rose-500/30", glowColor: "rgba(244, 63, 94, 0.4)", icon: "warning" },
    { badgeBg: "bg-sky-500/15", badgeText: "text-sky-300", badgeBorder: "border-sky-500/30", glowColor: "rgba(14, 165, 233, 0.4)", icon: "hub" },
    { badgeBg: "bg-pink-500/15", badgeText: "text-pink-300", badgeBorder: "border-pink-500/30", glowColor: "rgba(236, 72, 153, 0.4)", icon: "palette" },
  ];
  let hash = 0;
  for (let i = 0; i < categoryKey.length; i++) {
    hash = (hash << 5) - hash + categoryKey.charCodeAt(i);
  }
  const picked = palettes[Math.abs(hash) % palettes.length];

  return {
    label: cleanLabel,
    ...picked,
  };
}

export interface GridSpanInfo {
  id: GridSpanType;
  label: string;
  shortLabel: string;
  cols: number; // 1, 2, or 3
  rows: number; // 1 or 2
  tag: string;
  description: string;
  icon: string;
  badgeColor: string;
  recommended: string;
  wireframe: {
    // Indices 0..8 in a 3x3 blueprint matrix
    cells: number[];
  };
}

export const GRID_SPAN_CONFIG: Record<GridSpanType, GridSpanInfo> = {
  normal: {
    id: "normal",
    label: "Standard (1 Column)",
    shortLabel: "Standard Card",
    cols: 1,
    rows: 1,
    tag: "1 COL × 1 ROW",
    description: "Classic vertical editorial card with top cover visual, title, short excerpt, and author attribution.",
    icon: "crop_portrait",
    badgeColor: "text-gray-300 border-white/20 bg-white/5",
    recommended: "Standard updates, individual case notes, and regular blog stories.",
    wireframe: { cells: [0] },
  },
  wide: {
    id: "wide",
    label: "Wide (2 Columns)",
    shortLabel: "Wide Showcase",
    cols: 2,
    rows: 1,
    tag: "2 COLS × 1 ROW",
    description: "Spans two horizontal columns for cinematic visuals with balanced side-by-side or wide banner presence.",
    icon: "view_column",
    badgeColor: "text-sky-300 border-sky-500/30 bg-sky-500/10",
    recommended: "Flagship project milestones, tech launches, and rich visual stories.",
    wireframe: { cells: [0, 1] },
  },
  tall: {
    id: "tall",
    label: "Tall (2 Rows Vertical)",
    shortLabel: "Tall Feature",
    cols: 1,
    rows: 2,
    tag: "1 COL × 2 ROWS",
    description: "Portrait magazine card spanning two vertical rows with extended excerpt and prominent tag chips.",
    icon: "view_stream",
    badgeColor: "text-indigo-300 border-indigo-500/30 bg-indigo-500/10",
    recommended: "In-depth investigative reports, technical retrospectives, and deep dives.",
    wireframe: { cells: [0, 3] },
  },
  hero: {
    id: "hero",
    label: "Hero Banner (Full 3 Columns)",
    shortLabel: "Full Hero Banner",
    cols: 3,
    rows: 1,
    tag: "3 COLS FULL WIDTH",
    description: "Full-width widescreen horizontal showcase with cover art on the left and full story on the right.",
    icon: "web_stories",
    badgeColor: "text-[#2cecf7] border-[#2cecf7]/30 bg-[#2cecf7]/10",
    recommended: "Company flagship announcements, core breakthroughs, and lead chronicles.",
    wireframe: { cells: [0, 1, 2] },
  },
  split: {
    id: "split",
    label: "Horizontal Split (2 Columns 50/50)",
    shortLabel: "50/50 Split",
    cols: 2,
    rows: 1,
    tag: "2 COLS × 50/50",
    description: "Equal 50/50 horizontal split with high-res cover filling the left half and story copy on the right.",
    icon: "vertical_split",
    badgeColor: "text-teal-300 border-teal-500/30 bg-teal-500/10",
    recommended: "Founder interviews, executive commentaries, and before/after comparisons.",
    wireframe: { cells: [0, 1] },
  },
  quad: {
    id: "quad",
    label: "Magazine Quad (2 Columns × 2 Rows)",
    shortLabel: "2×2 Magazine Quad",
    cols: 2,
    rows: 2,
    tag: "2 COLS × 2 ROWS",
    description: "Massive 2×2 focal anchor block delivering maximum visual gravity with prominent typography.",
    icon: "grid_view",
    badgeColor: "text-purple-300 border-purple-500/30 bg-purple-500/10",
    recommended: "Anchor articles, annual recaps, and defining studio philosophy pieces.",
    wireframe: { cells: [0, 1, 3, 4] },
  },
  spotlight: {
    id: "spotlight",
    label: "Spotlight Accent (1 Column Glow)",
    shortLabel: "Spotlight Glow",
    cols: 1,
    rows: 1,
    tag: "1 COL NEON ACCENT",
    description: "1-column elevated card highlighted by an illuminated #2cecf7 cyan glow border and pulsing spotlight badge.",
    icon: "flare",
    badgeColor: "text-[#2cecf7] border-[#2cecf7]/40 bg-[#2cecf7]/15",
    recommended: "Editor's weekly pick, viral releases, and high-priority reads without eating extra columns.",
    wireframe: { cells: [1] },
  },
  compact: {
    id: "compact",
    label: "Compact Dispatch (1 Column Mini)",
    shortLabel: "Compact Mini",
    cols: 1,
    rows: 1,
    tag: "1 COL COMPACT MINI",
    description: "Low-profile horizontal card with a square thumbnail on the left and streamlined title & read time.",
    icon: "view_list",
    badgeColor: "text-amber-300 border-amber-500/30 bg-amber-500/10",
    recommended: "Quick dispatches, patch notes, security bulletins, and snackable reads.",
    wireframe: { cells: [2] },
  },
  overlay: {
    id: "overlay",
    label: "Cinematic Overlay (2 Columns Full-Bleed)",
    shortLabel: "Full-Bleed Overlay",
    cols: 2,
    rows: 1,
    tag: "2 COLS FULL-BLEED",
    description: "Full-bleed background artwork with frosted dark gradient and luminous typography rendered directly on the image.",
    icon: "wallpaper",
    badgeColor: "text-pink-300 border-pink-500/30 bg-pink-500/10",
    recommended: "Visually arresting chronicles, concept showcases, and design system reveals.",
    wireframe: { cells: [1, 2] },
  },
  strip: {
    id: "strip",
    label: "Panorama Ribbon (Full 3 Columns Slim)",
    shortLabel: "Panorama Ribbon",
    cols: 3,
    rows: 1,
    tag: "3 COLS SLIM RIBBON",
    description: "Full 3-column slim horizontal banner bar with left thumbnail, center narrative, and right action trigger.",
    icon: "view_day",
    badgeColor: "text-emerald-300 border-emerald-500/30 bg-emerald-500/10",
    recommended: "Studio news bulletins, breaking event notices, and horizontal timeline entries.",
    wireframe: { cells: [3, 4, 5] },
  },
};
