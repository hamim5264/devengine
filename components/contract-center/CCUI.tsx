import AdminStatusChip, { normalizeAdminStatus } from "@/components/admin/AdminStatusChip";
// components/contract-center/CCUI.tsx
// ─────────────────────────────────────────────────────────────
// Reusable UI components & badges for DevEngine Contract Center
// ─────────────────────────────────────────────────────────────

import React from "react";
import styles from "@/components/admin/AdminWidgets.module.css";
import Link from "next/link";
import {
  CCQuotationStatus,
  CCNDAStatus,
  CCServiceAgreementStatus,
  CCDocumentType,
  CC_DOCUMENT_TYPE_LABELS,
} from "@/types/contractCenter";

export function CCStatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  return <AdminStatusChip status={status} label={normalizeAdminStatus(status).replace(/_/g, " ").toUpperCase()} className={className} />;
}

export function CCStatCard({
  title,
  value,
  subtext,
  icon,
  trend,
  color = "pink",
}: {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: string;
  color?: "pink" | "emerald" | "amber" | "sky" | "purple";
}) {
  return <div className={styles.stat} data-admin-metric>
    <div className={styles.statTop}><span>{title}</span>{icon && <div className={styles.statIcon}>{icon}</div>}</div>
    <div className={styles.value}><strong>{value}</strong>{trend && <span>{trend}</span>}</div>
    {subtext && <p>{subtext}</p>}
  </div>;
}

export function CCHeaderNav({ current }: { current: string }) {
  const links = [
    { label: "Overview", href: "/admin/contract-center" },
    { label: "Clients", href: "/admin/contract-center/clients" },
    { label: "Projects", href: "/admin/contract-center/projects" },
    { label: "Quotations", href: "/admin/contract-center/quotations" },
    { label: "NDAs", href: "/admin/contract-center/ndas" },
    { label: "Agreements", href: "/admin/contract-center/agreements" },
    { label: "SOWs", href: "/admin/contract-center/sow" },
    { label: "Change Orders", href: "/admin/contract-center/change-orders" },
    { label: "Signatures", href: "/admin/contract-center/signatures" },
    { label: "Milestones", href: "/admin/contract-center/milestones" },
    { label: "Templates", href: "/admin/contract-center/templates" },
    { label: "Payments", href: "/admin/contract-center/payments" },
    { label: "Audit Log", href: "/admin/contract-center/audit" },
    { label: "Settings", href: "/admin/contract-center/settings" },
  ];

  return (
    <nav className={styles.nav} aria-label="Contract Center sections">
      {links.map((link) => {
        const isActive = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function getCurrencySymbol(currency: string = "BDT"): string {
  const c = (currency || "BDT").toUpperCase();
  if (c === "BDT") return "৳";
  if (c === "USD") return "$";
  if (c === "EUR") return "€";
  if (c === "GBP") return "£";
  if (c === "INR") return "₹";
  return `${currency} `;
}

export function formatCCPrice(amount: number = 0, currency: string = "BDT"): string {
  const sym = getCurrencySymbol(currency);
  return `${sym}${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function BDTIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center font-bold font-sans select-none ${className}`}
      title="Bangladeshi Taka (BDT)"
    >
      ৳
    </span>
  );
}
