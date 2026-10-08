// types/staff.ts

export type StaffType =
  | "manager"
  | "developer"
  | "designer"
  | "hr"
  | "marketing"
  | "support"
  | "qa_tester"
  | "intern"
  | (string & {});

export type StaffStatus = "active" | "suspended";

export interface StaffRole {
  id: string;
  key: string;
  label: string;
  description?: string;
  color?: { bg: string; text: string; border: string; hex?: string };
  defaultModules?: string[];
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffMember {
  id: string;
  uid: string; // Firebase Auth UID
  name: string;
  email: string;
  password?: string; // Stored so admin can view, copy, and edit staff passwords
  avatarUrl?: string; // Profile picture URL or uploaded asset path
  staffType: StaffType;
  allowedModules: string[]; // Array of MODULE_KEY values
  status: StaffStatus;
  phone?: string;
  designation?: string;
  assignedOffDays?: string[]; // e.g. ["Friday", "Saturday"]
  shiftHours?: { start: string; end: string; name?: string }; // e.g. { start: "09:00", end: "18:00", name: "Day Shift" }
  agreementId?: string; // ID of linked agreement in agreements collection
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

/** Color presets for custom role badges */
export const ROLE_COLOR_PRESETS = [
  { name: "Cyan", bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", hex: "#06b6d4" },
  { name: "Violet", bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", hex: "#8b5cf6" },
  { name: "Emerald", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", hex: "#10b981" },
  { name: "Amber", bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", hex: "#f59e0b" },
  { name: "Pink", bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30", hex: "#ec4899" },
  { name: "Blue", bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", hex: "#3b82f6" },
  { name: "Rose", bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30", hex: "#f43f5e" },
  { name: "Orange", bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", hex: "#f97316" },
  { name: "Purple", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", hex: "#a855f7" },
  { name: "Teal", bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/30", hex: "#14b8a6" },
];

/** Default standard roles provided out of the box */
export const DEFAULT_STAFF_ROLES: StaffRole[] = [
  {
    id: "manager",
    key: "manager",
    label: "Manager",
    description: "General project & team management with access to high-level modules",
    color: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", hex: "#8b5cf6" },
    defaultModules: ["overview", "projects", "commerce"],
    isCustom: false,
  },
  {
    id: "developer",
    key: "developer",
    label: "Developer",
    description: "Engineering team member with project code and integration access",
    color: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", hex: "#06b6d4" },
    defaultModules: ["overview", "projects"],
    isCustom: false,
  },
  {
    id: "designer",
    key: "designer",
    label: "Designer",
    description: "UI/UX and creative assets management",
    color: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30", hex: "#ec4899" },
    defaultModules: ["projects", "content_cms"],
    isCustom: false,
  },
  {
    id: "hr",
    key: "hr",
    label: "HR",
    description: "People operations and human resource management",
    color: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", hex: "#f59e0b" },
    defaultModules: ["overview"],
    isCustom: false,
  },
  {
    id: "marketing",
    key: "marketing",
    label: "Marketing",
    description: "Growth, content CMS and social networks",
    color: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", hex: "#10b981" },
    defaultModules: ["content_cms", "social_network"],
    isCustom: false,
  },
  {
    id: "support",
    key: "support",
    label: "Support",
    description: "Customer service, commerce orders and inquiries",
    color: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", hex: "#3b82f6" },
    defaultModules: ["commerce"],
    isCustom: false,
  },
  {
    id: "qa_tester",
    key: "qa_tester",
    label: "QA / Tester",
    description: "Quality assurance, test verification and issue tracking",
    color: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", hex: "#f97316" },
    defaultModules: ["projects"],
    isCustom: false,
  },
  {
    id: "intern",
    key: "intern",
    label: "Intern",
    description: "Apprentice / junior member with limited module access",
    color: { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30", hex: "#9ca3af" },
    defaultModules: ["overview"],
    isCustom: false,
  },
];

/** Staff type display labels dictionary with fallback */
export const STAFF_TYPE_LABELS: Record<string, string> = {
  manager: "Manager",
  developer: "Developer",
  designer: "Designer",
  hr: "HR",
  marketing: "Marketing",
  support: "Support",
  qa_tester: "QA / Tester",
  intern: "Intern",
};

/** Staff type badge colors dictionary */
export const STAFF_TYPE_COLORS: Record<string, { bg: string; text: string; border: string; hex?: string }> = {
  manager: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30", hex: "#8b5cf6" },
  developer: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", hex: "#06b6d4" },
  designer: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30", hex: "#ec4899" },
  hr: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30", hex: "#f59e0b" },
  marketing: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", hex: "#10b981" },
  support: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", hex: "#3b82f6" },
  qa_tester: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", hex: "#f97316" },
  intern: { bg: "bg-gray-500/10", text: "text-gray-400", border: "border-gray-500/30", hex: "#9ca3af" },
};

/** Helper to get role label */
export function getRoleLabel(roleKey: string, customRoles?: StaffRole[]): string {
  if (customRoles) {
    const found = customRoles.find((r) => r.key === roleKey || r.id === roleKey);
    if (found?.label) return found.label;
  }
  if (STAFF_TYPE_LABELS[roleKey]) return STAFF_TYPE_LABELS[roleKey];
  // Format slug to Title Case: "data_engineer" -> "Data Engineer"
  return roleKey
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Helper to get role badge style */
export function getRoleBadgeColor(
  roleKey: string,
  customRoles?: StaffRole[]
): { bg: string; text: string; border: string; hex?: string } {
  if (customRoles) {
    const found = customRoles.find((r) => r.key === roleKey || r.id === roleKey);
    if (found?.color) return found.color;
  }
  if (STAFF_TYPE_COLORS[roleKey]) return STAFF_TYPE_COLORS[roleKey];
  // Deterministic color based on hash of role key
  let hash = 0;
  for (let i = 0; i < roleKey.length; i++) {
    hash = roleKey.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % ROLE_COLOR_PRESETS.length;
  return ROLE_COLOR_PRESETS[index];
}

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
