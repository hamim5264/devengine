import { onAdminPageAccess } from "@/lib/services/staffAuth";
// pages/admin/contract-center/templates.tsx
// ─────────────────────────────────────────────────────────────
// DevEngine Contract Center — Document Templates & Clause Library
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import { CCHeaderNav } from "@/components/contract-center/CCUI";
import {
  getDocumentTemplates,
  getClauseLibrary,
  createDocumentTemplate,
  createClause,
} from "@/lib/services/contractCenterService";
import type {
  CCDocumentTemplate,
  CCClauseLibraryItem,
  CCTemplateType,
  CCClauseCategory,
} from "@/types/contractCenter";

export default function TemplatesAndClausesPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"templates" | "clauses">("templates");

  const [templates, setTemplates] = useState<CCDocumentTemplate[]>([]);
  const [clauses, setClauses] = useState<CCClauseLibraryItem[]>([]);

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isClauseModalOpen, setIsClauseModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Template Form
  const [templateForm, setTemplateForm] = useState({
    name: "",
    templateType: "service_agreement" as CCTemplateType,
    jurisdiction: "Bangladesh",
    content: "Standard Master Software Engineering Services Agreement blueprint with IP assignment.",
  });

  // Clause Form
  const [clauseForm, setClauseForm] = useState({
    title: "Intellectual Property Ownership Assignment",
    category: "ip" as CCClauseCategory,
    content: "Upon complete payment of all project fees, DevEngine assigns and transfers full ownership, copyrights, and intellectual property rights to the Client.",
    isMandatory: true,
  });

  useEffect(() => {
    const unsub = onAdminPageAccess(router, async (user) => {
      setAuthReady(true);
    }, () => {
      setAuthReady(false);
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, cList] = await Promise.all([getDocumentTemplates(), getClauseLibrary()]);
      setTemplates(tList);
      setClauses(cList);
    } catch (err) {
      console.error("Error loading templates and clauses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authReady) loadData();
  }, [authReady]);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateForm.name) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";

      await createDocumentTemplate(
        {
          name: templateForm.name,
          templateType: templateForm.templateType,
          version: 1,
          effectiveFrom: new Date().toISOString(),
          reviewStatus: "approved",
          jurisdiction: templateForm.jurisdiction,
          content: templateForm.content,
          variables: ["clientName", "totalValue", "projectTitle"],
          configurableClauses: ["ip", "payment", "liability"],
          requiredFields: ["clientLegalName", "effectiveDate"],
          optionalClauses: ["support"],
          legalReviewStatus: "approved",
          createdBy: performedBy,
        },
        performedBy
      );

      setIsTemplateModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to create template:", err);
      alert("Failed to create template.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClause = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clauseForm.title || !clauseForm.content) return;

    setSaving(true);
    try {
      const user = auth.currentUser;
      const performedBy = user?.email || "Admin";

      await createClause(
        {
          title: clauseForm.title,
          category: clauseForm.category,
          version: 1,
          applicableDocTypes: ["service_agreement", "sow"],
          content: clauseForm.content,
          isMandatory: clauseForm.isMandatory,
          defaultActive: true,
          sortOrder: clauses.length + 1,
          legalReviewRequired: false,
          createdBy: performedBy,
        },
        performedBy
      );

      setIsClauseModalOpen(false);
      await loadData();
    } catch (err) {
      console.error("Failed to create clause:", err);
      alert("Failed to create clause.");
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
        <title>Templates & Clause Library — DevEngine Contract Center</title>
      </Head>

      <div className="px-5 sm:px-8 lg:px-10 py-6 space-y-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Templates & Standard Clause Library</h1>
            <p className="text-sm text-slate-400">
              Maintain legally vetted standard clauses, liability waivers, IP provisions, and contract blueprints.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTemplateModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all"
            >
              + New Template
            </button>
            <button
              onClick={() => setIsClauseModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 hover:from-pink-400 hover:to-rose-500 transition-all"
            >
              + New Clause
            </button>
          </div>
        </div>

        {/* Sub Navigation */}
        <CCHeaderNav current="/admin/contract-center/templates" />

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-2">
          <button
            onClick={() => setActiveTab("templates")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "templates"
                ? "bg-pink-500/15 text-pink-400 border border-pink-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Contract Templates ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab("clauses")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "clauses"
                ? "bg-pink-500/15 text-pink-400 border border-pink-500/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Clause Library ({clauses.length})
          </button>
        </div>

        {/* Templates Tab */}
        {activeTab === "templates" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-pink-400 font-bold uppercase">v{tpl.version}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 capitalize">
                    {tpl.reviewStatus}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">{tpl.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2">{tpl.content || "Standard approved template"}</p>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="capitalize">{tpl.templateType.replace(/_/g, " ")}</span>
                  <span>{tpl.jurisdiction}</span>
                </div>
              </div>
            ))}
            {templates.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No contract templates configured yet. Click "+ New Template" to add one.
              </div>
            )}
          </div>
        )}

        {/* Clauses Tab */}
        {activeTab === "clauses" && (
          <div className="space-y-3">
            {clauses.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-sm space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-pink-400 capitalize">{c.category}</span>
                    <h3 className="font-bold text-white text-sm">{c.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.isMandatory && (
                      <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px]">
                        Mandatory
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase">
                      v{c.version}
                    </span>
                  </div>
                </div>
                <p className="text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                  {c.content}
                </p>
              </div>
            ))}
            {clauses.length === 0 && (
              <div className="py-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No clauses added to the library yet. Click "+ New Clause" to add standard clauses.
              </div>
            )}
          </div>
        )}

        {/* Template Modal */}
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Create Document Template</h3>
                <button
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveTemplate} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Standard Web Engineering MSA"
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Template Type</label>
                  <select
                    value={templateForm.templateType}
                    onChange={(e) => setTemplateForm({ ...templateForm, templateType: e.target.value as CCTemplateType })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="service_agreement">Master Service Agreement</option>
                    <option value="nda_mutual">Mutual NDA</option>
                    <option value="nda_one_way">One-Way NDA</option>
                    <option value="sow">Statement of Work</option>
                    <option value="quotation">Quotation / Proposal</option>
                    <option value="change_order">Change Order</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Jurisdiction</label>
                  <input
                    type="text"
                    value={templateForm.jurisdiction}
                    onChange={(e) => setTemplateForm({ ...templateForm, jurisdiction: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Description / Content Summary</label>
                  <textarea
                    rows={3}
                    value={templateForm.content}
                    onChange={(e) => setTemplateForm({ ...templateForm, content: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-medium"
                  >
                    {saving ? "Saving..." : "Create Template"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Clause Modal */}
        {isClauseModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white">Add Legal Clause</h3>
                <button
                  onClick={() => setIsClauseModalOpen(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveClause} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Clause Category</label>
                  <select
                    value={clauseForm.category}
                    onChange={(e) => setClauseForm({ ...clauseForm, category: e.target.value as CCClauseCategory })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="ip">Intellectual Property (IP)</option>
                    <option value="commercial">Commercial / Fees</option>
                    <option value="confidentiality">Confidentiality</option>
                    <option value="liability">Limitation of Liability</option>
                    <option value="warranties">Warranties & Support</option>
                    <option value="dispute_resolution">Dispute Resolution</option>
                    <option value="termination">Termination</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Clause Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Limitation of Liability"
                    value={clauseForm.title}
                    onChange={(e) => setClauseForm({ ...clauseForm, title: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-300 mb-1">Clause Legal Body *</label>
                  <textarea
                    rows={4}
                    required
                    value={clauseForm.content}
                    onChange={(e) => setClauseForm({ ...clauseForm, content: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isMandatory"
                    checked={clauseForm.isMandatory}
                    onChange={(e) => setClauseForm({ ...clauseForm, isMandatory: e.target.checked })}
                    className="rounded bg-slate-800 border-slate-700 text-pink-500"
                  />
                  <label htmlFor="isMandatory" className="text-slate-300">
                    Mandatory in all Service Agreements
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsClauseModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white font-medium"
                  >
                    {saving ? "Saving..." : "Save Clause"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
