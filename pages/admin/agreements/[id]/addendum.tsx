import React, { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import AdminLayout from "@/components/AdminLayout";
import HelixLoader from "@/components/HelixLoader";
import {
  getAgreement,
  createAgreementAddendum,
  getAddendaForAgreement,
  finalizeAgreementAddendum,
} from "@/lib/services/agreementService";
import { generateAddendumPdf } from "@/lib/utils/generateAddendumPdf";
import { AgreementRecord, AgreementAddendumRecord, ClauseAmendmentDiff } from "@/types/agreement";

const ADMIN_EMAIL =
  process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com";

const PRESET_CLAUSES = [
  {
    id: "sec_profit_duration",
    title: "Section 3 / Duration of Profit Participation",
    defaultRationale: "Clarify ongoing indefinite duration without arbitrary 24-month or post-service cutoff.",
    defaultOriginal: "Participation shall commence on the Public Launch Date and remain in effect for a period of twenty-four (24) months.",
    defaultReplacement: "Participation shall commence on the Effective Date and continue on an ongoing indefinite basis with no fixed expiry date, surviving the conclusion of active services.",
  },
  {
    id: "sec_post_service",
    title: "Section 14 / Post-Termination Entitlements",
    defaultRationale: "Align separation terms so active service end does not extinguish earned profit share.",
    defaultOriginal: "Upon termination of active services for convenience, contributor participation shall extinguish within twelve (12) months.",
    defaultReplacement: "The Contributor's ongoing participation in Net Distributable Project Profit shall remain unimpaired following conclusion of active services, subject only to ongoing compliance with confidentiality and non-breach covenants.",
  },
  {
    id: "sec_compensation_pct",
    title: "Section 3 / Participation Percentage",
    defaultRationale: "Adjust commercial profit sharing percentage.",
    defaultOriginal: "Contributor shall receive 10% of Net Distributable Project Profit.",
    defaultReplacement: "Contributor shall receive 15% of Net Distributable Project Profit, calculated and distributed quarterly.",
  },
  {
    id: "sec_custom_amendment",
    title: "Custom Clause Amendment",
    defaultRationale: "Bespoke commercial or technical modification.",
    defaultOriginal: "",
    defaultReplacement: "",
  },
];

export default function AgreementAddendumPage() {
  const router = useRouter();
  const { id } = router.query;

  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [agreement, setAgreement] = useState<AgreementRecord | null>(null);
  const [existingAddenda, setExistingAddenda] = useState<AgreementAddendumRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form State
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [amendedClauses, setAmendedClauses] = useState<ClauseAmendmentDiff[]>([
    {
      clauseId: "sec_profit_duration",
      clauseTitle: "Duration of Profit Participation",
      rationale: "Align with intended commercial agreement of ongoing indefinite profit share.",
      originalText: "Participation shall commence on the Public Launch Date and remain in effect for a period of twenty-four (24) months.",
      replacementText: "Participation shall commence on the Effective Date and continue on an ongoing indefinite basis with no fixed expiry date, surviving conclusion of active services.",
    },
  ]);
  const [unchangedAffirmation, setUnchangedAffirmation] = useState(
    "All other terms, conditions, warranties, and covenants of the Principal Agreement not expressly modified or amended by this Addendum shall remain unaltered and in full legal force and effect."
  );
  const [precedenceClause, setPrecedenceClause] = useState(
    "In the event of any direct conflict, ambiguity, or discrepancy between the terms of this Addendum and the terms of the Principal Agreement, the express terms of this Addendum shall govern, prevail, and control."
  );

  // Auth gate
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      const ok = !!user && user.email === ADMIN_EMAIL;
      setIsAdmin(ok);
      setAuthReady(true);
      if (!ok) router.replace(`/login?redirect=/admin/agreements/${id}/addendum`);
    });
    return () => unsub();
  }, [router, id]);

  // Load parent agreement and existing addenda
  useEffect(() => {
    if (!isAdmin || !id || typeof id !== "string") return;

    async function loadData() {
      try {
        setLoading(true);
        const [agrData, addendaData] = await Promise.all([
          getAgreement(id as string),
          getAddendaForAgreement(id as string),
        ]);
        setAgreement(agrData);
        setExistingAddenda(addendaData);
      } catch (err: any) {
        console.error("Error loading agreement addenda:", err);
        setNotice({ text: err?.message || "Failed to load agreement.", type: "error" });
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isAdmin, id]);

  // Add Clause Amendment
  const handleAddClause = (presetIndex = 0) => {
    const preset = PRESET_CLAUSES[presetIndex] || PRESET_CLAUSES[0];
    setAmendedClauses((prev) => [
      ...prev,
      {
        clauseId: preset.id === "sec_custom_amendment" ? `custom_${Date.now()}` : preset.id,
        clauseTitle: preset.title,
        rationale: preset.defaultRationale,
        originalText: preset.defaultOriginal,
        replacementText: preset.defaultReplacement,
      },
    ]);
  };

  const handleUpdateClause = (index: number, field: keyof ClauseAmendmentDiff, value: string) => {
    setAmendedClauses((prev) => {
      const list = [...prev];
      list[index] = { ...list[index], [field]: value };
      return list;
    });
  };

  const handleRemoveClause = (index: number) => {
    setAmendedClauses((prev) => prev.filter((_, i) => i !== index));
  };

  // Build draft record object
  const buildAddendumRecord = (status: "draft" | "ready_for_signature" | "executed" = "draft"): AgreementAddendumRecord => {
    const nextAddendumSeq = (existingAddenda.length + 1).toString().padStart(4, "0");
    const addendumNumber = `DEV-ADD-${new Date().getFullYear()}-${nextAddendumSeq}`;

    return {
      id: `${agreement?.id}_add_${Date.now()}`,
      addendumNumber,
      parentAgreementId: agreement?.id || (id as string),
      parentAgreementNumber: agreement?.agreementNumber || "N/A",
      projectTitle: agreement?.project.projectName || "N/A",
      contributorName: agreement?.developer.legalName || agreement?.developer.fullName || "N/A",
      effectiveDate,
      status,
      amendedClauses,
      unchangedAffirmation,
      precedenceClause,
      createdBy: "hamim.leon@gmail.com",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Preview PDF
  const handlePreviewPdf = async () => {
    if (!agreement) return;
    const addendumData = buildAddendumRecord("ready_for_signature");
    await generateAddendumPdf(addendumData, agreement, { download: true });
  };

  // Save / Execute Addendum
  const handleSaveAddendum = async (asExecuted = false) => {
    if (!agreement) return;
    if (amendedClauses.length === 0) {
      alert("Please specify at least one clause to amend.");
      return;
    }

    try {
      setSaving(true);
      const status = asExecuted ? "executed" : "draft";
      const addendumData = buildAddendumRecord(status);

      if (asExecuted) {
        addendumData.executedAt = new Date().toISOString();
        addendumData.executedBy = "hamim.leon@gmail.com";
      }

      // Generate PDF Blob
      const { blob } = await generateAddendumPdf(addendumData, agreement, { download: false, returnBlob: true });

      // Save addendum to Firestore
      const addendumId = await createAgreementAddendum(
        addendumData,
        "hamim.leon@gmail.com"
      );

      if (asExecuted) {
        await finalizeAgreementAddendum(addendumId, "hamim.leon@gmail.com", blob);
      }

      setNotice({
        text: asExecuted
          ? `Addendum ${addendumData.addendumNumber} successfully executed and linked to ${agreement.agreementNumber}!`
          : `Addendum draft ${addendumData.addendumNumber} saved successfully.`,
        type: "success",
      });

      // Reload addenda
      const updatedList = await getAddendaForAgreement(agreement.id);
      setExistingAddenda(updatedList);
    } catch (err: any) {
      console.error("Save addendum error:", err);
      setNotice({ text: err?.message || "Failed to save addendum.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!authReady || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#07070d] flex flex-col items-center justify-center text-white">
        <HelixLoader size={48} color="#38f2ff" />
        <p className="mt-4 font-mono text-xs text-gray-400 tracking-widest uppercase">
          Verifying Admin Authorization…
        </p>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Contract Addendum & Amendment — DevEngine Admin</title>
      </Head>

      <div className="min-h-screen bg-[#07070d] text-white flex flex-col font-sans">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Breadcrumbs & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-gray-500 mb-2">
                <Link href="/admin/dashboard" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  Dashboard
                </Link>
                <span>/</span>
                <Link href="/admin/agreements" className="text-gray-400 hover:text-cyan-400 transition-colors">
                  Agreements
                </Link>
                <span>/</span>
                <span className="text-cyan-400 font-bold">{agreement?.agreementNumber}</span>
                <span>/</span>
                <span className="text-amber-400 font-bold">Addendum</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-400 text-3xl">history_edu</span>
                <span>Contract Addendum & Amendment Workflow</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 font-mono">
                Legally amend specific provisions while preserving original contract immutability and audit trails.
              </p>
            </div>

            <Link
              href={`/admin/agreements/${id}/edit`}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white font-mono text-xs transition-all border border-white/[0.08] flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Back to Agreement</span>
            </Link>
          </div>

          {/* Flash Notice */}
          {notice && (
            <div
              className={`p-4 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-mono border backdrop-blur-xl shadow-xl ${
                notice.type === "error"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-lg">
                  {notice.type === "error" ? "error" : "check_circle"}
                </span>
                <span>{notice.text}</span>
              </div>
              <button type="button" onClick={() => setNotice(null)} className="text-gray-400 hover:text-white p-1">
                ✕
              </button>
            </div>
          )}

          {loading ? (
            <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
              <HelixLoader size={44} color="#38f2ff" />
              <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                Loading Principal Agreement…
              </p>
            </div>
          ) : !agreement ? (
            <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
              <span className="material-symbols-outlined text-3xl text-rose-400">error</span>
              <p className="text-rose-300 font-mono text-sm">Principal agreement not found.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Parent Agreement Summary Card */}
              <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl grid grid-cols-1 md:grid-cols-4 gap-5">
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Principal Contract</span>
                  <span className="text-sm font-bold text-white font-mono">{agreement.agreementNumber}</span>
                  <span className="text-xs text-gray-400 block mt-0.5">{agreement.project.projectName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Contributor / Counterparty</span>
                  <span className="text-sm font-bold text-white">{agreement.developer.legalName || agreement.developer.fullName}</span>
                  <span className="text-xs text-gray-400 block mt-0.5">{agreement.developer.role}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Original Effective Date</span>
                  <span className="text-sm font-mono text-white">{agreement.project.agreementEffectiveDate}</span>
                  <span className="text-xs text-emerald-400 block mt-0.5">Status: {agreement.status.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider block">Executed Addenda</span>
                  <span className="text-sm font-mono text-amber-400 font-bold">{existingAddenda.length} Recorded</span>
                </div>
              </div>

              {/* Existing Addenda History */}
              {existingAddenda.length > 0 && (
                <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-xl space-y-4">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <span className="material-symbols-outlined text-cyan-400 text-lg">history</span>
                    <span>Existing Addenda for this Agreement</span>
                  </h3>
                  <div className="space-y-3">
                    {existingAddenda.map((add) => (
                      <div
                        key={add.id}
                        className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-bold text-white">{add.addendumNumber}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                              {add.status.toUpperCase()}
                            </span>
                            <span className="text-xs font-mono text-gray-400">Effective: {add.effectiveDate}</span>
                          </div>
                          <p className="text-xs text-gray-300 mt-1">
                            {add.amendedClauses.length} clauses amended: {add.amendedClauses.map((c) => c.clauseTitle).join(", ")}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => generateAddendumPdf(add, agreement, { download: true })}
                          className="px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono flex items-center gap-1.5 shrink-0"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          <span>Download PDF</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Addendum Form */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] backdrop-blur-xl shadow-2xl space-y-8">
                <div className="border-b border-white/[0.08] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white">
                      Draft New Contract Addendum
                    </h2>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">
                      Specify replacement wording side-by-side with original text.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-mono text-gray-400 uppercase">Effective Date:</label>
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                </div>

                {/* Clauses to Amend List */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm font-mono uppercase tracking-wider text-cyan-400">
                      Clauses to Amend ({amendedClauses.length})
                    </h3>

                    {/* Presets quick adder */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">Add Preset:</span>
                      <button
                        type="button"
                        onClick={() => handleAddClause(0)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-cyan-500/20 text-xs font-mono text-gray-300 hover:text-cyan-300 border border-white/[0.08]"
                      >
                        + Ongoing Duration
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddClause(1)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-cyan-500/20 text-xs font-mono text-gray-300 hover:text-cyan-300 border border-white/[0.08]"
                      >
                        + Post-Termination
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddClause(3)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.05] hover:bg-cyan-500/20 text-xs font-mono text-gray-300 hover:text-cyan-300 border border-white/[0.08]"
                      >
                        + Custom Clause
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {amendedClauses.map((clause, idx) => (
                      <div
                        key={idx}
                        className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4 relative"
                      >
                        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                          <span className="font-mono text-xs text-amber-400 font-bold uppercase">
                            Amendment #{idx + 1}: {clause.clauseTitle || "New Amendment"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveClause(idx)}
                            className="text-gray-500 hover:text-rose-400 p-1 cursor-pointer"
                            title="Remove clause amendment"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono text-gray-400 uppercase">Clause Title</label>
                            <input
                              type="text"
                              value={clause.clauseTitle}
                              onChange={(e) => handleUpdateClause(idx, "clauseTitle", e.target.value)}
                              className="w-full h-10 bg-black/50 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono text-gray-400 uppercase">Commercial / Legal Rationale</label>
                            <input
                              type="text"
                              value={clause.rationale}
                              onChange={(e) => handleUpdateClause(idx, "rationale", e.target.value)}
                              placeholder="Reason for amendment..."
                              className="w-full h-10 bg-black/50 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                        </div>

                        {/* Side-by-Side Diff Editor */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono text-rose-400 uppercase font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">remove_circle_outline</span>
                              <span>Original / Superseded Provision</span>
                            </label>
                            <textarea
                              rows={4}
                              value={clause.originalText}
                              onChange={(e) => handleUpdateClause(idx, "originalText", e.target.value)}
                              placeholder="Paste original clause text being replaced..."
                              className="w-full bg-rose-500/[0.04] border border-rose-500/20 focus:border-rose-400 rounded-xl p-3 text-xs text-gray-300 focus:outline-none font-mono leading-relaxed resize-none"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-mono text-emerald-400 uppercase font-bold flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">add_circle_outline</span>
                              <span>Replacement Provision (In Effect)</span>
                            </label>
                            <textarea
                              rows={4}
                              value={clause.replacementText}
                              onChange={(e) => handleUpdateClause(idx, "replacementText", e.target.value)}
                              placeholder="Enter binding amended wording..."
                              className="w-full bg-emerald-500/[0.04] border border-emerald-500/20 focus:border-emerald-400 rounded-xl p-3 text-xs text-white focus:outline-none font-mono leading-relaxed resize-none"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 3 & 4: Affirmations & Precedence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                      Unchanged Provisions Affirmation
                    </label>
                    <textarea
                      rows={3}
                      value={unchangedAffirmation}
                      onChange={(e) => setUnchangedAffirmation(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl p-3 text-xs text-gray-300 focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                      Precedence Over Conflicting Terms Clause
                    </label>
                    <textarea
                      rows={3}
                      value={precedenceClause}
                      onChange={(e) => setPrecedenceClause(e.target.value)}
                      className="w-full bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl p-3 text-xs text-gray-300 focus:outline-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/[0.08]">
                  <p className="text-xs font-mono text-gray-500">
                    Executing this Addendum links it permanently to {agreement.agreementNumber} without modifying historical records.
                  </p>

                  <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
                    {/* Preview Button */}
                    <button
                      type="button"
                      onClick={handlePreviewPdf}
                      className="h-11 px-5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 active:bg-cyan-500/25 text-cyan-300 hover:text-cyan-200 font-mono text-xs font-bold transition-all border border-cyan-500/30 hover:border-cyan-400/50 flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10 whitespace-nowrap shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                      <span>Preview Addendum PDF</span>
                    </button>

                    {/* Save Draft Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveAddendum(false)}
                      disabled={saving}
                      className="h-11 px-5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] active:bg-white/[0.15] text-gray-200 hover:text-white font-mono text-xs font-semibold transition-all border border-white/[0.12] hover:border-white/[0.2] cursor-pointer disabled:opacity-50 flex items-center gap-2 whitespace-nowrap shrink-0 shadow-sm"
                    >
                      {saving ? (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="material-symbols-outlined text-lg text-gray-400">save</span>
                      )}
                      <span>Save Draft</span>
                    </button>

                    {/* Execute Addendum Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveAddendum(true)}
                      disabled={saving}
                      className="h-11 px-6 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500 hover:from-amber-300 hover:via-amber-400 hover:to-orange-400 text-black font-mono text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg shadow-amber-500/25 hover:shadow-amber-500/35 active:scale-[0.98] cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-lg font-bold">draw</span>
                      <span>{saving ? "Executing…" : "Execute Addendum"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AdminLayout>
  );
}
