import type { StaffMember } from "@/types/staff";

export interface StudioModule {
  key: string;
  label: string;
  icon: string;
  description: string;
  items: { label: string; href: string }[];
}

const item = (label: string, page: string) => ({ label, href: `/admin/${page}` });

/** Employee destinations and page authorization share this registry. */
export const STUDIO_MODULES: StudioModule[] = [
  { key: "overview", label: "Overview", icon: "dashboard", description: "Studio dashboard and activity", items: [item("Studio Dashboard", "dashboard")] },
  { key: "commerce", label: "Commerce", icon: "shopping_bag", description: "Orders, payments, and currencies", items: [item("Orders & Payments", "manage-orders"), item("Invoice PDF Settings", "manage-pdf-settings"), item("Currencies", "manage-currencies")] },
  { key: "contract_center", label: "Contract Center", icon: "description", description: "Clients, agreements, and delivery", items: [item("Overview", "contract-center"), ...["clients", "projects", "quotations", "ndas", "agreements", "sow", "change-orders", "signatures", "milestones", "templates", "payments", "audit", "settings"].map((page) => item(({ ndas: "NDAs", sow: "Statements of Work", "change-orders": "Change Orders", audit: "Audit Trail" } as Record<string, string>)[page] || page[0].toUpperCase() + page.slice(1), `contract-center/${page}`))] },
  { key: "projects", label: "Projects", icon: "folder_open", description: "Projects, categories, and agreements", items: [item("Add Project", "add-project"), item("Manage Projects", "manage-projects"), item("Manage Categories", "manage-categories"), item("Agreements", "agreements"), item("Manage Tags", "manage-tags")] },
  { key: "content_cms", label: "Content CMS", icon: "edit_note", description: "Manage the studio's public content", items: [item("Landing", "manage-landing"), item("Archive", "manage-archive"), item("Launchpad", "manage-launchpad"), item("Services", "manage-services"), item("Blog", "manage-blog"), item("Reviews", "manage-reviews"), item("About & Team", "manage-about"), item("Careers", "manage-careers"), item("Docs & API", "manage-documentation"), item("Update Logs", "manage-update-logs"), item("Lab", "manage-lab"), item("Lab Categories", "manage-lab-categories"), item("App Lab", "app-lab/manage")] },
  { key: "social_network", label: "Social & Network", icon: "share", description: "Social channels and network hubs", items: [item("Socials & Follow Us", "manage-socials"), item("Network Hubs", "manage-network")] },
  { key: "legal", label: "Legal", icon: "gavel", description: "Policies and public legal documents", items: [item("App Policies & Hub", "manage-app-legal"), item("Terms & Conditions", "manage-terms"), item("Privacy Policy", "manage-privacy"), item("License Agreement", "manage-license"), item("Refund Policy", "manage-refund"), item("Security Protocol", "manage-security")] },
  { key: "system", label: "System", icon: "settings", description: "Maintenance, PDF settings, and recovery", items: [item("Invoice & PDF Settings", "manage-pdf-settings"), item("Maintenance Mode", "manage-maintenance"), item("Recycle Bin", "manage-bin")] },
];

export function hasStudioModule(staff: StaffMember | null, module: string) {
  return staff?.status === "active" && (staff.allowedModules?.includes(module) || staff.allowedModules?.includes("all")) === true;
}

/** An empty result is admin-only. Never infer permission for unknown pages. */
export function modulesForAdminRoute(path: string): string[] {
  const pathname = path.split(/[?#]/)[0].replace(/\/$/, "");
  if (["/admin/profile", "/admin/project-briefs", "/admin/manage-staff", "/admin/manage-staff-roles", "/admin/manage-certificates", "/admin/manage-theme-settings"].includes(pathname)) return [];
  if (pathname.startsWith("/admin/contract-center")) return ["contract_center"];
  if (pathname.startsWith("/admin/agreements/") || pathname.startsWith("/admin/edit-project/")) return ["projects"];
  if (pathname.startsWith("/admin/app-lab/")) return ["content_cms"];
  if (["/admin/manage-categories", "/admin/manage-lab-categories"].includes(pathname)) return ["projects", "content_cms"];
  return STUDIO_MODULES.filter((module) => module.items.some((entry) => entry.href === pathname)).map((module) => module.key);
}
