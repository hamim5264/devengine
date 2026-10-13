// components/contract-center/CCUI.tsx
// ─────────────────────────────────────────────────────────────
// Reusable UI components & badges for DevEngine Contract Center
// ─────────────────────────────────────────────────────────────

import React from "react";
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
  const getBadgeStyle = (st: string) => {
    switch (st.toLowerCase()) {
      case "active":
      case "approved":
      case "accepted":
      case "executed":
      case "completed":
      case "paid":
      case "signed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "in_review":
      case "pending":
      case "pending_signatures":
      case "sent":
        return "bg-amber-500/10 text-amber-300 border-amber-500/30";
      case "draft":
      case "in_progress":
        return "bg-sky-500/10 text-sky-300 border-sky-500/30";
      case "rejected":
      case "declined":
      case "terminated":
      case "cancelled":
      case "expired":
        return "bg-rose-500/10 text-rose-400 border-rose-500/30";
      case "partially_paid":
      case "due":
        return "bg-purple-500/10 text-purple-300 border-purple-500/30";
      case "archived":
      case "inactive":
        return "bg-slate-700/30 text-slate-400 border-slate-700";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  const formatText = (st: string) => {
    return st.replace(/_/g, " ").toUpperCase();
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getBadgeStyle(
        status
      )} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-80" />
      {formatText(status)}
    </span>
  );
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
  const colorMap = {
    pink: "from-pink-500/20 to-rose-500/5 text-pink-400 border-pink-500/20",
    emerald: "from-emerald-500/20 to-teal-500/5 text-emerald-400 border-emerald-500/20",
    amber: "from-amber-500/20 to-yellow-500/5 text-amber-400 border-amber-500/20",
    sky: "from-sky-500/20 to-blue-500/5 text-sky-400 border-sky-500/20",
    purple: "from-purple-500/20 to-indigo-500/5 text-purple-400 border-purple-500/20",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-gradient-to-br ${colorMap[color]} bg-slate-900/60 p-5 backdrop-blur-md transition-all hover:border-slate-600 hover:shadow-lg`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          {title}
        </span>
        {icon && <div className="text-xl opacity-80">{icon}</div>}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">{value}</span>
        {trend && <span className="text-xs font-medium text-emerald-400">{trend}</span>}
      </div>
      {subtext && <p className="mt-1 text-xs text-slate-400">{subtext}</p>}
    </div>
  );
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
    <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-2 mb-6 scrollbar-thin scrollbar-thumb-slate-700">
      {links.map((link) => {
        const isActive = current === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              isActive
                ? "bg-pink-500/15 text-pink-400 border border-pink-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
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
