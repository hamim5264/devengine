import React, { useState, useEffect } from "react";
import { AgreementRecord } from "@/types/agreement";
import { buildAgreementClauses, AgreementClauseSection } from "@/lib/agreements/agreementClauses";
import { generateAgreementPdf } from "@/lib/utils/generateAgreementPdf";

interface AgreementPreviewModalProps {
  record: AgreementRecord;
  isOpen: boolean;
  onClose: () => void;
  onFinalize?: () => void;
  isFinalizing?: boolean;
}

export default function AgreementPreviewModal({
  record,
  isOpen,
  onClose,
  onFinalize,
  isFinalizing = false,
}: AgreementPreviewModalProps) {
  const [downloading, setDownloading] = useState(false);
  const [clauses, setClauses] = useState<AgreementClauseSection[]>([]);
  const [signatureSrc, setSignatureSrc] = useState<string>("");
  const [viewMode, setViewMode] = useState<"dark" | "paper">("dark");

  useEffect(() => {
    if (isOpen) {
      setClauses(buildAgreementClauses(record));
      fetch("/api/receipt-assets")
        .then((res) => res.json())
        .then((data) => {
          if (data.signatureBase64) {
            setSignatureSrc(data.signatureBase64);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, record]);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      await generateAgreementPdf(record, { download: true });
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("Failed to generate PDF. Check console for details.");
    } finally {
      setDownloading(false);
    }
  };

  const isDark = viewMode === "dark";

  return (
    <div className="fixed inset-0 z-[999] flex flex-col bg-black/90 backdrop-blur-md overflow-hidden animate-fadeIn">
      {/* Pinned Responsive Header Bar */}
      <div className="bg-[#0c0c16]/98 border-b border-white/[0.1] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 z-50 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-white font-bold tracking-wider uppercase">
                AGREEMENT PREVIEW
              </span>
              <span className="text-gray-500 font-mono text-xs hidden sm:inline">/</span>
              <span className="text-cyan-400 font-mono text-xs font-bold">{record.agreementNumber}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase font-semibold">
                {record.status}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 font-mono truncate hidden md:block">
              Exact publication representation matching the official multi-page A4 PDF output
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-black/60 border border-white/[0.1] rounded-xl p-0.5 font-mono text-xs">
            <button
              type="button"
              onClick={() => setViewMode("dark")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                isDark ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-gray-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-sm">dark_mode</span>
              <span>Executive Dark</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("paper")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                !isDark ? "bg-white text-slate-900 font-semibold shadow" : "text-gray-400 hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-sm">description</span>
              <span>White Paper</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-200 hover:text-white font-sans text-xs font-medium transition-all border border-white/[0.08] cursor-pointer flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="hidden sm:inline">Back to Edit</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="h-9 px-4 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 hover:brightness-110 text-slate-950 font-sans text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_18px_rgba(56,189,248,0.25)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {downloading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Generating…</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Download PDF</span>
              </>
            )}
          </button>

          {onFinalize && record.status !== "finalized" && (
            <button
              type="button"
              onClick={onFinalize}
              disabled={isFinalizing}
              className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-sans text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isFinalizing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Finalizing…</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">verified</span>
                  <span>Finalize</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer ml-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Document Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#04060a] flex justify-center">
        <div
          className={`w-full max-w-4xl rounded-2xl shadow-2xl p-6 sm:p-12 space-y-8 transition-all ${
            isDark
              ? "bg-[#0b101d] border border-white/[0.08] text-slate-200"
              : "border border-slate-300"
          }`}
          style={!isDark ? { backgroundColor: "#ffffff", color: "#0f172a" } : undefined}
        >
          {/* Letterhead */}
          <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b-2 gap-4 ${
              isDark ? "border-cyan-500/20" : "border-slate-900"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className={`text-2xl font-black font-['Space_Grotesk'] tracking-tight ${isDark ? "text-white" : "text-slate-950"}`}>
                  DEVENGINE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/30">
                  OFFICIAL INSTRUMENT
                </span>
              </div>
              <p className={`text-[11px] font-sans tracking-wider uppercase font-medium ${isDark ? "text-gray-400" : "text-slate-500"}`}>
                Custom Software • Cloud Architecture • Systems Engineering
              </p>
            </div>

            <div className={`text-left sm:text-right font-mono text-[11px] space-y-0.5 ${isDark ? "text-gray-400" : "text-slate-600"}`}>
              <p className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>DEVENGINE TECHNOLOGY OPERATIONS</p>
              <p className="text-cyan-400 font-semibold">{record.devengine.companyWebsite || "https://thedevengine.vercel.app"}</p>
              <p>{record.devengine.companyEmail}</p>
            </div>
          </div>

          {/* Title Banner */}
          <div
            className={`rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 ${
              isDark
                ? "bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-cyan-500/30 shadow-[0_0_30px_rgba(56,189,248,0.1)]"
                : "bg-slate-950 text-white"
            }`}
          >
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
                OFFICIAL LEGAL CONTRACT & PROJECT AGREEMENT
              </span>
              <h1 className="text-xl sm:text-2xl font-bold font-['Space_Grotesk'] tracking-tight text-white">
                {record.agreementTypeLabel.toUpperCase()}
              </h1>
              <p className="text-xs text-slate-300">
                Project: <strong className="text-white font-semibold">"{record.project.projectName}"</strong>
                <span className="mx-2 text-slate-500">•</span>
                Contributor:{" "}
                <span className="inline-block px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-bold text-xs">
                  {record.developer.fullName}
                </span>
              </p>
            </div>

            <div className="text-left sm:text-right text-xs font-mono space-y-1 shrink-0 border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-6 text-slate-300">
              <p><span className="text-slate-400">AGR ID:</span> <strong className="text-cyan-300">{record.agreementNumber}</strong></p>
              <p><span className="text-slate-400">VERSION:</span> <strong className="text-white">{record.version}</strong></p>
              <p><span className="text-slate-400">EFFECTIVE:</span> <strong className="text-white">{record.project.agreementEffectiveDate}</strong></p>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {record.status}
              </span>
            </div>
          </div>

          {/* Structured Clauses */}
          <div className="space-y-7">
            {clauses.map((clause) => {
              const isParties = clause.number === "1";
              const isOverview = clause.number === "3";

              return (
                <section key={clause.number} className="space-y-3.5">
                  {/* Section Title Bar */}
                  <div
                    className={`px-4 py-2.5 rounded-xl font-['Space_Grotesk'] font-bold text-xs uppercase tracking-wider flex items-center gap-2.5 ${
                      isDark
                        ? "bg-[#101728] border border-white/[0.08] text-white border-l-4 border-l-cyan-400"
                        : "bg-slate-900 text-white border-l-4 border-l-cyan-400"
                    }`}
                  >
                    <span className="text-cyan-400 font-mono font-bold text-sm">#{clause.number}</span>
                    <span>{clause.title}</span>
                  </div>

                  {/* Section 1: Contributor Profile Highlight Card */}
                  {isParties ? (
                    <div className="space-y-3 pt-1">
                      {/* Company Party */}
                      <div className={`p-4 rounded-xl text-xs space-y-1 ${isDark ? "bg-white/[0.02] border border-white/[0.06]" : "bg-slate-50 border border-slate-200"}`}>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] uppercase font-bold text-cyan-400">PARTY A (COMPANY):</span>
                          <strong className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>DEVENGINE TECHNOLOGY OPERATIONS</strong>
                        </div>
                        <p className={`leading-relaxed text-[11.5px] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          Under the executive direction of <strong className={isDark ? "text-white" : "text-slate-900"}>{record.devengine.ceoName}</strong> ({record.devengine.ceoTitle}). Operational headquarters at DevEngine Technology Operations, Dhaka, Bangladesh. Official Website: <span className="text-cyan-400 font-semibold">{record.devengine.companyWebsite || "https://thedevengine.vercel.app"}</span>
                        </p>
                      </div>

                      {/* Contributor Party - Highlight Card */}
                      <div
                        className={`p-4 rounded-xl border-l-4 border-l-cyan-400 space-y-2 text-xs ${
                          isDark
                            ? "bg-gradient-to-r from-cyan-500/10 to-transparent border border-cyan-500/30"
                            : "bg-cyan-50/50 border border-cyan-200"
                        }`}
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="font-mono text-[10px] uppercase font-bold text-cyan-400">PARTY B (CONTRIBUTOR / DEVELOPER):</span>
                          <span className="px-2 py-0.5 rounded bg-cyan-400/20 text-cyan-300 font-mono text-[10px] font-bold">
                            CONTRACTOR
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <h4 className={`text-base font-bold font-['Space_Grotesk'] tracking-wide ${isDark ? "text-cyan-300" : "text-slate-950"}`}>
                            {record.developer.fullName.toUpperCase()}
                          </h4>
                          {record.developer.professionalName && (
                            <span className="text-xs text-gray-400 font-mono">
                              (known as "{record.developer.professionalName}")
                            </span>
                          )}
                        </div>
                        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px] ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">Role</span>
                            <strong className={isDark ? "text-white" : "text-slate-900"}>{record.developer.role}</strong>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">Email</span>
                            <strong className={isDark ? "text-white" : "text-slate-900"}>{record.developer.email}</strong>
                          </div>
                          <div>
                            <span className="text-gray-400 block text-[10px] uppercase">Phone</span>
                            <strong className={isDark ? "text-white" : "text-slate-900"}>{record.developer.phone || "On Record"}</strong>
                          </div>
                        </div>
                        {record.developer.address && (
                          <p className={`text-[11px] font-mono pt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                            Residential Address: <strong className={isDark ? "text-slate-200" : "text-slate-700"}>{record.developer.address}</strong>
                          </p>
                        )}
                      </div>
                    </div>
                  ) : isOverview ? (
                    /* Section 3: Structured Project Overview Grid */
                    <div className="space-y-3 pt-1">
                      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl ${isDark ? "bg-white/[0.02] border border-white/[0.06]" : "bg-slate-50 border border-slate-200"}`}>
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">Project Title</span>
                          <strong className={`text-sm font-bold block ${isDark ? "text-white" : "text-slate-900"}`}>
                            {record.project.projectName}
                          </strong>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold block">Domain / Type</span>
                          <strong className={`text-sm font-bold block ${isDark ? "text-white" : "text-slate-900"}`}>
                            {record.project.projectType || "Software Application"}
                          </strong>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">Commencement Date</span>
                          <span className={`font-mono text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                            {record.project.agreementEffectiveDate}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-mono uppercase text-gray-400 font-bold block">Target Completion</span>
                          <span className={`font-mono text-xs font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                            {record.project.expectedCompletionDate || "Per sprint schedule"}
                          </span>
                        </div>
                      </div>

                      {clause.paragraphs && clause.paragraphs.slice(2).map((p, idx) => (
                        <p key={idx} className={`leading-relaxed text-xs px-1 ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                          {p}
                        </p>
                      ))}
                    </div>
                  ) : (
                    /* Standard Clause Paragraphs */
                    clause.paragraphs && clause.paragraphs.length > 0 && (
                      <div className="space-y-2.5 px-1">
                        {clause.paragraphs.map((p, idx) => (
                          <p
                            key={idx}
                            className={`leading-relaxed text-xs ${
                              isDark ? "text-slate-300" : "text-slate-700"
                            }`}
                          >
                            {p}
                          </p>
                        ))}
                      </div>
                    )
                  )}

                  {/* Table Data if available */}
                  {clause.tableData && clause.tableData.rows.length > 0 && (
                    <div className={`overflow-x-auto my-3 rounded-xl border ${isDark ? "border-white/[0.08]" : "border-slate-300"}`}>
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className={isDark ? "bg-[#0f172a] text-cyan-300" : "bg-slate-900 text-white"}>
                            {clause.tableData.headers.map((h, i) => (
                              <th key={i} className="py-2.5 px-3 font-mono font-bold text-[11px] uppercase tracking-wider">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className={`divide-y text-[11.5px] ${isDark ? "divide-white/[0.05]" : "divide-slate-200"}`}>
                          {clause.tableData.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={
                                isDark
                                  ? rIdx % 2 === 1
                                    ? "bg-white/[0.02]"
                                    : "bg-transparent"
                                  : rIdx % 2 === 1
                                  ? "bg-slate-50"
                                  : "bg-white"
                              }
                            >
                              {row.map((cell, cIdx) => (
                                <td
                                  key={cIdx}
                                  className={`py-2.5 px-3 align-top leading-relaxed ${
                                    isDark ? "text-slate-300" : "text-slate-800"
                                  } ${cIdx === 1 ? "font-semibold" : ""}`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {/* Formal Execution Signatures */}
          <div className={`pt-6 border-t-2 space-y-4 ${isDark ? "border-white/[0.1]" : "border-slate-300"}`}>
            <p className={`font-bold text-xs uppercase tracking-wider ${isDark ? "text-slate-300" : "text-slate-800"}`}>
              IN WITNESS WHEREOF, the Parties have executed this Agreement as of the Effective Date.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              {/* DevEngine Side */}
              <div className={`rounded-2xl p-5 space-y-3 ${isDark ? "bg-white/[0.03] border border-white/[0.08]" : "bg-slate-50 border border-slate-200"}`}>
                <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-wider uppercase block">
                  FOR AND ON BEHALF OF DEVENGINE:
                </span>

                <div className="h-16 flex items-center">
                  {signatureSrc ? (
                    <img src={signatureSrc} alt="CEO Signature" className="max-h-14 object-contain filter invert brightness-200" />
                  ) : (
                    <span className="font-serif italic text-cyan-300 text-sm">
                      [MD. Abdul Hamim Leon — Authorized]
                    </span>
                  )}
                </div>

                <div className={`pt-2 border-t text-xs space-y-0.5 ${isDark ? "border-white/[0.08] text-slate-300" : "border-slate-300 text-slate-700"}`}>
                  <p className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>{record.devengine.ceoName}</p>
                  <p className="text-gray-400">{record.devengine.ceoTitle}, DevEngine</p>
                  <p className="text-[11px] text-cyan-400 font-mono">Date Executed: {record.project.agreementEffectiveDate}</p>
                </div>
              </div>

              {/* Contributor Side */}
              <div className={`rounded-2xl p-5 space-y-3 ${isDark ? "bg-white/[0.03] border border-white/[0.08]" : "bg-slate-50 border border-slate-200"}`}>
                <span className="text-[10px] font-mono text-cyan-400 font-bold tracking-wider uppercase block">
                  FOR AND ON BEHALF OF CONTRIBUTOR:
                </span>

                <div className="h-16 flex items-end pb-1">
                  <span className="text-xs text-gray-400 font-mono italic">
                    [Digitally Executed Counterpart]
                  </span>
                </div>

                <div className={`pt-2 border-t text-xs space-y-0.5 ${isDark ? "border-white/[0.08] text-slate-300" : "border-slate-300 text-slate-700"}`}>
                  <p className="font-bold text-cyan-300 text-sm">{record.developer.fullName.toUpperCase()}</p>
                  <p className="text-gray-400">Role: {record.developer.role}</p>
                  <p className="text-[11px] text-gray-400 font-mono">Date: ________________________</p>
                </div>
              </div>
            </div>
          </div>

          {/* Running Footer Note */}
          <div className={`pt-4 border-t flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono gap-2 ${isDark ? "border-white/[0.08] text-gray-500" : "border-slate-200 text-slate-400"}`}>
            <span>DevEngine Technology Operations • {record.devengine.companyWebsite || "https://thedevengine.vercel.app"}</span>
            <span>Doc Ref: {record.agreementNumber} (v{record.version})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
