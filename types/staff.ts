// types/staff.ts

export type StaffType =
  | "manager"
  | "developer"
  | "designer"
  | "hr"
  | "marketing"
  | "support"
  | "qa_tester"
  | "intern";

export type StaffStatus = "active" | "suspended";

export interface StaffMember {
  id: string;
  uid: string; // Firebase Auth UID
  name: string;
  email: string;
  staffType: StaffType;
  allowedModules: string[]; // Array of MODULE_KEY values
  status: StaffStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/** Staff type display labels */
export const STAFF_TYPE_LABELS: Record<StaffType, string> = {
  manager: "Manager",
  developer: "Developer",
  designer: "Designer",
  hr: "HR",
  marketing: "Marketing",
  support: "Support",
  qa_tester: "QA / Tester",
  intern: "Intern",
};

/** Staff type badge colors */
export const STAFF_TYPE_COLORS: Record<StaffType, { bg: string; text: string; border: string }> = {
  manager: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30" },
  developer: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  designer: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30" },
  hr: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  marketing: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  support: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  qa_tester: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  intern: { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30" },
};

/** Module keys matching the admin drawer groups */
export const MODULE_KEYS = {
  overview: "overview",
  commerce: "commerce",
  projects: "projects",
  content_cms: "content_cms",
  social_network: "social_network",
  legal: "legal",
  system: "system",
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];

/** Module display config */
export const MODULE_CONFIG: Record<string, { label: string; icon: string; color: string; description: string }> = {
  overview: {
    label: "Overview",
    icon: "dashboard",
    color: "#14b8a6",
    description: "Dashboard & analytics",
  },
  commerce: {
    label: "Commerce",
    icon: "shopping_bag",
    color: "#34d399",
    description: "Orders, payments & currencies",
  },
  projects: {
    label: "Projects",
    icon: "folder_open",
    color: "#60a5fa",
    description: "Projects, agreements & tags",
  },
  content_cms: {
    label: "Content CMS",
    icon: "edit_note",
    color: "#a78bfa",
    description: "Landing, blog, services & more",
  },
  social_network: {
    label: "Social & Network",
    icon: "share",
    color: "#38bdf8",
    description: "Socials & network hubs",
  },
  legal: {
    label: "Legal",
    icon: "gavel",
    color: "#fb923c",
    description: "Terms, privacy, license & policies",
  },
  system: {
    label: "System",
    icon: "settings",
    color: "#f59e0b",
    description: "Maintenance & recycle bin",
  },
};
