import { AdminSelect, AdminDateInput } from "@/components/admin/AdminFormControls";
import { onAdminPageAccess } from "@/lib/services/staffAuth";
// pages/admin/contract-center/quotations/create.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Interactive Quotation Builder
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav } from "@/components/contract-center/CCUI";
import {
  getClients,
  getProjects,
  getQuotationById,
  createQuotation,
  updateQuotation,
} from "@/lib/services/contractCenterService";
import type {
  CCClient,
  CCProject,
  CCQuotation,
  CCQuotationLineItem,
  CCPaymentMilestone,
  CCCommercialModel,
  CCCurrency,
  CCQuotationStatus,
} from "@/types/contractCenter";

export default function QuotationCreatePage() {
  const router = useRouter();
  const { editId, clientId: preClientId, projectId: preProjectId } = router.query;

  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Reference data
  const [clients, setClients] = useState<CCClient[]>([]);
  const [projects, setProjects] = useState<CCProject[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [commercialModel, setCommercialModel] = useState<CCCommercialModel>("milestone");
  const [currency, setCurrency] = useState<CCCurrency>("BDT");
  const [validUntilDate, setValidUntilDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [executiveSummary, setExecutiveSummary] = useState("");
  const [termsText, setTermsText] = useState(
    "1. 50% advance deposit upon agreement execution, remaining on project delivery.\n2. Source code and intellectual property transferred upon final payment.\n3. 30-day post-launch warranty included."
  );

  // Discount configuration
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountPercent, setDiscountPercent] = useState<number>(10);

  // Line items
  const [lineItems, setLineItems] = useState<CCQuotationLineItem[]>([
    {
      id: "item-1",
      name: "Core Architecture & UI/UX Design",
      description: "Complete technical architecture, system schema, high-fidelity prototypes and UI system.",
      quantity: 1,
      unit: "fixed",
      unitPrice: 150000,
      taxRate: 0,
      lineTotal: 150000,
      sortOrder: 1,
    },
    {
      id: "item-2",
      name: "Full-Stack Implementation & Integrations",
      description: "Frontend responsive web app, secure API endpoints, database, and third-party integrations.",
      quantity: 1,
      unit: "fixed",
      unitPrice: 350000,
      taxRate: 0,
      lineTotal: 350000,
      sortOrder: 2,
    },
  ]);

  // Payment Milestones
  const [paymentMilestones, setPaymentMilestones] = useState<CCPaymentMilestone[]>([
    {
      id: "m-1",
      description: "Project Kickoff & Advance Deposit",
      percentage: 50,
      amount: 250000,
      triggerEvent: "Upon contract signing",
      status: "pending",
      sortOrder: 1,
    },
    {
      id: "m-2",
      description: "Final QA Delivery & Handover",
      percentage: 50,
      amount: 250000,
      triggerEvent: "Upon successful staging acceptance",
      status: "pending",
      sortOrder: 2,
    },
  ]);

  useEffect(() => {
    const unsub = onAdminPageAccess(router, async (user) => {
      setAuthReady(true);
    }, () => {
      setAuthReady(false);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!authReady) return;
    const initData = async () => {
      setLoading(true);
      try {
        const [cliList, projList] = await Promise.all([getClients(), getProjects()]);
        setClients(cliList);
        setProjects(projList);

        if (preClientId && typeof preClientId === "string") {
          setSelectedClientId(preClientId);
        } else if (cliList.length > 0) {
          setSelectedClientId(cliList[0].id);
        }

        if (preProjectId && typeof preProjectId === "string") {
          setSelectedProjectId(preProjectId);
        }

        // If editing existing quote
        if (editId && typeof editId === "string") {
          const existing = await getQuotationById(editId);
          if (existing) {
            setTitle(existing.title);
            setSelectedClientId(existing.clientId);
            setSelectedProjectId(existing.projectId || "");
            setCommercialModel(existing.commercialModel);
            setCurrency(existing.currency);
            setValidUntilDate(existing.validUntilDate?.split("T")[0] || "");
            setExecutiveSummary(existing.scope?.executiveSummary || "");
            setTermsText(existing.terms?.additionalConditions || "");
            if (existing.hasDiscount !== undefined) {
              setHasDiscount(Boolean(existing.hasDiscount));
              setDiscountPercent(existing.discountPercent || 10);
            } else if (existing.totalDiscount && existing.totalDiscount > 0 && existing.subtotal && existing.subtotal > 0) {
              setHasDiscount(true);
              const calculatedPct = Math.round((existing.totalDiscount / existing.subtotal) * 100);
              setDiscountPercent(Math.min(100, Math.max(1, calculatedPct || 10)));
            }
            if (existing.lineItems?.length) setLineItems(existing.lineItems);
            if (existing.paymentSchedule?.length) setPaymentMilestones(existing.paymentSchedule);
          }
        }
      } catch (err) {
        console.error("Failed to load initial quotation builder data:", err);
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, [authReady, editId, preClientId, preProjectId]);

  // Recalculate line total when inputs change
  const updateLineItem = (index: number, updates: Partial<CCQuotationLineItem>) => {
    setLineItems((prev) => {
      const next = [...prev];
      const current = { ...next[index], ...updates };
      const sub = current.quantity * current.unitPrice;
      const discount = current.discountAmount || 0;
      const tax = current.taxRate ? (sub - discount) * (current.taxRate / 100) : 0;
      current.lineTotal = Math.max(0, sub - discount + tax);
      next[index] = current;
      return next;
    });
  };

  const addLineItem = () => {
    const newItem: CCQuotationLineItem = {
      id: `item-${Date.now()}`,
      name: "New Deliverable Item",
      description: "",
      quantity: 1,
      unit: "fixed",
      unitPrice: 500,
      lineTotal: 500,
      sortOrder: lineItems.length + 1,
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const lineItemDiscount = lineItems.reduce((sum, item) => sum + (item.discountAmount || 0), 0);
  const activeDiscountPct = hasDiscount && discountPercent > 0 ? Math.min(100, Math.max(1, Math.round(discountPercent))) : 0;
  const quoteDiscountAmount = activeDiscountPct > 0 ? Math.round(((subtotal - lineItemDiscount) * activeDiscountPct) / 100) : 0;
  const totalDiscount = lineItemDiscount + quoteDiscountAmount;
  const totalTax = lineItems.reduce((sum, item) => {
    const discount = item.discountAmount || 0;
    const base = item.quantity * item.unitPrice - discount;
    return sum + (item.taxRate ? base * (item.taxRate / 100) : 0);
  }, 0);
  const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);

  // Automatically update milestone amounts whenever grandTotal changes
  useEffect(() => {
    setPaymentMilestones((prev) =>
      prev.map((m) => ({
        ...m,
        amount: Math.round(((m.percentage || 0) / 100) * grandTotal),
      }))
    );
  }, [grandTotal]);

  // Sync milestone amounts when grand total changes
  const updateMilestonePercent = (index: number, pct: number) => {
    setPaymentMilestones((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        percentage: pct,
        amount: Math.round((pct / 100) * grandTotal),
      };
      return next;
    });
  };

  const addMilestone = () => {
    setPaymentMilestones([
      ...paymentMilestones,
      {
        id: `m-${Date.now()}`,
        description: `Milestone ${paymentMilestones.length + 1}`,
        percentage: 0,
        amount: 0,
        status: "pending",
        sortOrder: paymentMilestones.length + 1,
      },
    ]);
  };

  const removeMilestone = (index: number) => {
    setPaymentMilestones(paymentMilestones.filter((_, i) => i !== index));
  };

  const totalMilestonePercent = paymentMilestones.reduce((sum, m) => sum + (m.percentage || 0), 0);

  const handleSave = async (statusToSet: CCQuotationStatus = "draft") => {
    if (!title) {
      alert("Please provide a proposal title.");
      return;
    }
    if (!selectedClientId) {
      alert("Please select a client.");
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";
      const selClient = clients.find((c) => c.id === selectedClientId);
      const selProject = projects.find((p) => p.id === selectedProjectId);

      const quotationPayload: Partial<CCQuotation> = {
        title,
        clientId: selectedClientId,
        clientName: selClient ? selClient.legalName : undefined,
        clientSnapshot: selClient ? { ...selClient } : undefined,
        projectId: selectedProjectId || undefined,
        projectTitle: selProject ? selProject.title : undefined,
        commercialModel,
        currency,
        validUntilDate,
        lineItems,
        subtotal,
        totalDiscount,
        hasDiscount: Boolean(hasDiscount && discountPercent > 0),
        discountPercent: hasDiscount ? Math.min(100, Math.max(1, Math.round(discountPercent))) : 0,
        totalTax,
        grandTotal,
        approvedExpenses: 0,
        scope: {
          executiveSummary,
          paymentTerms: termsText,
        },
        deliveryPhases: [],
        paymentSchedule: paymentMilestones,
        terms: {
          validityDays: 30,
          acceptanceMethod: "written_approval",
          requiresDeposit: true,
          depositAmount: paymentMilestones[0]?.amount || 0,
          isBindingOffer: true,
          requiresSeparateAgreement: true,
          additionalConditions: termsText,
        },
        status: statusToSet,
        preparedBy: performedBy,
        preparedByName: "DevEngine Commercial Team",
      };

      if (editId && typeof editId === "string") {
        await updateQuotation(editId, quotationPayload, performedBy);
      } else {
        await createQuotation(quotationPayload, performedBy);
      }

      router.push("/admin/contract-center/quotations");
    } catch (err: any) {
      console.error("Failed to save quotation:", err);
      alert(err.message || "Failed to save quotation.");
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || loading) {
    return (
      <AdminLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <HelixLoader />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>{editId ? "Edit Quotation" : "Build Quotation"} — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="/admin/contract-center/quotations"
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back to Quotations
              </Link>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              {editId ? "Edit Quotation Proposal" : "Commercial Quotation Builder"}
            </h1>
            <p className="text-sm text-slate-400">Build a quotation with line items and milestones.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave("draft")}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:text-white hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              onClick={() => handleSave("approved")}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save & Approve"}
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/quotations" />

        {/* Builder Form Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 2-column form */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. General Details */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400">
                1. Quotation Identification & Parties
              </h2>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Proposal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. E-commerce web and mobile app"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Client Entity *</label>
                  <AdminSelect
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="">Select Client...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.legalName} ({c.clientNumber})
                      </option>
                    ))}
                  </AdminSelect>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Linked Project (Optional)</label>
                  <AdminSelect
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="">No linked project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.projectNumber})
                      </option>
                    ))}
                  </AdminSelect>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Commercial Model</label>
                  <AdminSelect
                    value={commercialModel}
                    onChange={(e) => setCommercialModel(e.target.value as CCCommercialModel)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="milestone">Milestone-Based</option>
                    <option value="fixed_price">Fixed Price</option>
                    <option value="itemized_fixed">Itemized Fixed Price</option>
                    <option value="hourly">Hourly Billing</option>
                    <option value="monthly_retainer">Monthly Retainer</option>
                    <option value="time_and_materials">Time & Materials</option>
                  </AdminSelect>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Currency</label>
                  <AdminSelect
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as CCCurrency)}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="BDT">BDT (৳)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED</option>
                  </AdminSelect>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Valid Until Date</label>
                <AdminDateInput
                  type="date"
                  value={validUntilDate}
                  onChange={(e) => setValidUntilDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Executive Summary / Scope</label>
                <textarea
                  rows={3}
                  placeholder="Scope, approach, and expected outcomes"
                  value={executiveSummary}
                  onChange={(e) => setExecutiveSummary(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            {/* 2. Line Items Table */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400">
                  2. Itemized Deliverables & Pricing
                </h2>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/30 hover:bg-pink-500/20 transition-all"
                >
                  + Add Line Item
                </button>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-slate-500 font-bold">#{index + 1}</span>
                      <input
                        type="text"
                        placeholder="Deliverable Name (e.g. Database Architecture)"
                        value={item.name}
                        onChange={(e) => updateLineItem(index, { name: e.target.value })}
                        className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium focus:outline-none focus:border-pink-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Delete item"
                      >
                        ✕
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Detailed item description / specifications..."
                      value={item.description}
                      onChange={(e) => updateLineItem(index, { description: e.target.value })}
                      className="w-full px-3 py-1.5 bg-slate-900/60 border border-slate-700/60 rounded-lg text-slate-300 text-xs focus:outline-none focus:border-pink-500"
                    />

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-400">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, { quantity: Number(e.target.value) })}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Unit Price ({currency})</label>
                        <input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateLineItem(index, { unitPrice: Number(e.target.value) })}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Tax Rate (%)</label>
                        <input
                          type="number"
                          min="0"
                          value={item.taxRate || 0}
                          onChange={(e) => updateLineItem(index, { taxRate: Number(e.target.value) })}
                          className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400">Line Total</label>
                        <div className="px-2 py-1 bg-slate-900/80 border border-slate-800 rounded font-semibold text-pink-400">
                          {item.lineTotal.toLocaleString()} {currency}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quotation Discount & Adjustment */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#2cecf7]">
                    Quotation Discount
                  </h2>
                  <p className="text-xs text-slate-400">
                    Apply a commercial percentage discount to the entire quotation scope
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasDiscount}
                    onChange={(e) => setHasDiscount(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2cecf7] accent-[#2cecf7] cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-slate-200">
                    Apply Discount
                  </span>
                </label>
              </div>

              {hasDiscount && (
                <div className="flex flex-wrap items-center gap-4 p-3.5 rounded-xl bg-slate-800/40 border border-[#2cecf7]/30">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-300 font-medium">Discount Percentage:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        step="1"
                        value={discountPercent}
                        onChange={(e) => {
                          const val = e.target.value === "" ? 0 : Number(e.target.value);
                          setDiscountPercent(Math.min(100, Math.max(1, val)));
                        }}
                        className="w-20 px-2.5 py-1.5 bg-slate-900 border border-[#2cecf7] rounded-lg text-[#2cecf7] text-center font-bold font-mono text-sm focus:outline-none"
                      />
                      <span className="text-[#2cecf7] font-bold text-sm">%</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 font-mono">
                    Deduction: <strong className="text-rose-400 font-bold">-{quoteDiscountAmount.toLocaleString()} {currency}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Payment Milestones Schedule */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400">
                    3. Payment Milestones Schedule
                  </h2>
                  <p className="text-xs text-slate-400">
                    Define client billing events (total must equal 100%)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addMilestone}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-pink-500/10 text-pink-400 border border-pink-500/30 hover:bg-pink-500/20 transition-all"
                >
                  + Add Milestone
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {paymentMilestones.map((m, idx) => (
                  <div
                    key={m.id}
                    className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800"
                  >
                    <input
                      type="text"
                      placeholder="Milestone description..."
                      value={m.description}
                      onChange={(e) => {
                        const next = [...paymentMilestones];
                        next[idx].description = e.target.value;
                        setPaymentMilestones(next);
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          placeholder="%"
                          value={m.percentage}
                          onChange={(e) => updateMilestonePercent(idx, Number(e.target.value))}
                          className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-center"
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                      <div className="w-24 text-right font-semibold text-emerald-400">
                        {m.amount?.toLocaleString()} {currency}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMilestone(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs pt-2">
                <span className="text-slate-400">Total Allocated Percentage:</span>
                <span
                  className={`font-bold ${
                    totalMilestonePercent === 100 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {totalMilestonePercent}% {totalMilestonePercent === 100 ? "✓ (Balanced)" : "(Must be 100%)"}
                </span>
              </div>
            </div>

            {/* 4. Terms & Conditions */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-pink-400">
                4. Terms & Conditions
              </h2>
              <textarea
                rows={4}
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          {/* Right column: Summary card & Action sticky */}
          <div className="space-y-6">
            <div className="sticky top-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md p-5 space-y-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Financial Summary
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="text-white font-mono">{subtotal.toLocaleString()} {currency}</span>
                </div>

                {totalDiscount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Discount {hasDiscount && discountPercent > 0 ? `(${discountPercent}%)` : ""}:</span>
                    <span className="text-rose-400 font-mono">-{totalDiscount.toLocaleString()} {currency}</span>
                  </div>
                )}

                {totalTax > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Estimated Tax:</span>
                    <span className="text-amber-400 font-mono">+{totalTax.toLocaleString()} {currency}</span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="font-bold text-slate-200">Grand Total:</span>
                  <span className="text-xl font-extrabold text-pink-400 font-mono">
                    {grandTotal.toLocaleString()} {currency}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 text-[11px] text-slate-400 space-y-1">
                <div>Client: <span className="text-white font-medium">{clients.find(c => c.id === selectedClientId)?.legalName || "Not selected"}</span></div>
                <div>Line items: <span className="text-white font-medium">{lineItems.length} items</span></div>
                <div>Milestones: <span className="text-white font-medium">{paymentMilestones.length} phases</span></div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleSave("draft")}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleSave("approved")}
                  disabled={saving}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-semibold text-xs shadow-lg shadow-pink-500/25 transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Finalize & Approve"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
