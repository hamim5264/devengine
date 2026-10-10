import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  AgreementRecord,
  AgreementType,
  AgreementMilestone,
  AgreementDeliverable,
  AgreementStatus,
  AGREEMENT_TYPE_LABELS,
  AGREEMENT_STATUS_LABELS,
  DEFAULT_PROFIT_EXPENSES,
  ProfitDurationModel,
  PROFIT_DURATION_LABELS,
  PostServiceTreatment,
  POST_SERVICE_TREATMENT_LABELS,
} from "@/types/agreement";
import { validateAgreement } from "@/lib/agreements/templateEngine";
import {
  createAgreement,
  updateAgreement,
  finalizeAgreement,
  generateNextAgreementNumber,
} from "@/lib/services/agreementService";
import { generateAgreementPdf } from "@/lib/utils/generateAgreementPdf";
import AgreementPreviewModal from "@/components/agreements/AgreementPreviewModal";
import FinalizeModal from "@/components/agreements/FinalizeModal";

interface AgreementFormProps {
  initialData: AgreementRecord;
  isEditing?: boolean;
}

const STEPS = [
  { id: 1, label: "Commercial Model", icon: "category" },
  { id: 2, label: "Project & Timeline", icon: "folder" },
  { id: 3, label: "Parties & Entity", icon: "person" },
  { id: 4, label: "Financial Terms", icon: "payments" },
  { id: 5, label: "Scope & Deliverables", icon: "checklist" },
  { id: 6, label: "Legal Parameters", icon: "gavel" },
  { id: 7, label: "Review & Lifecycle", icon: "fact_check" },
];

export default function AgreementForm({ initialData, isEditing = false }: AgreementFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<AgreementRecord>(initialData);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Custom expense category input
  const [newExpenseInput, setNewExpenseInput] = useState("");
  // Pre-existing IP disclosure input
  const [newPreExistingIp, setNewPreExistingIp] = useState("");

  // Modals
  const [previewOpen, setPreviewOpen] = useState(false);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizeSuccess, setFinalizeSuccess] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Legal warning explicit acknowledgment
  const [legalWarningsAcknowledged, setLegalWarningsAcknowledged] = useState(false);

  // Validation state
  const validation = validateAgreement(formData);

  // Sync initialData if editing
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // Handle Save Draft or Update Existing
  const handleSaveDraft = async (silent = false) => {
    try {
      setSaving(true);
      if (isEditing && formData.id) {
        if (formData.status === "executed") {
          setNotice({
            text: "This agreement is EXECUTED and immutable. Please use 'Create Addendum' to modify contractual terms.",
            type: "error",
          });
          return;
        }

        await updateAgreement(formData.id, formData);
        if (!silent) {
          setNotice({ text: "Agreement changes saved successfully.", type: "success" });
          setTimeout(() => setNotice(null), 3500);
        }
      } else {
        const nextNumber = formData.agreementNumber || (await generateNextAgreementNumber());
        const createdId = await createAgreement({
          ...formData,
          agreementNumber: nextNumber,
          status: "draft",
        });
        if (!silent) {
          setNotice({ text: "Agreement draft created successfully!", type: "success" });
        }
        router.replace(`/admin/agreements/${createdId}/edit`);
      }
    } catch (err: any) {
      console.error("Save draft error:", err);
      if (!silent) {
        setNotice({ text: err?.message || "Failed to save agreement.", type: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle Finalize Snapshot (Locks draft and marks validated snapshot)
  const handleConfirmFinalize = async () => {
    if (!validation.valid) {
      alert(`Cannot finalize: Please address validation errors:\n${validation.errors.join("\n")}`);
      setFinalizeModalOpen(false);
      return;
    }

    try {
      setFinalizing(true);
      setFinalizeError(null);
      let agreementId = formData.id;

      if (!isEditing || !agreementId) {
        const nextNumber = formData.agreementNumber || (await generateNextAgreementNumber());
        agreementId = await createAgreement({
          ...formData,
          agreementNumber: nextNumber,
        });
      } else {
        await updateAgreement(agreementId, formData);
      }

      // Generate PDF Blob for Storage persistence & download
      const { blob } = await generateAgreementPdf(
        { ...formData, id: agreementId, status: "finalized" },
        { download: true, returnBlob: true }
      );

      // Finalize record in Firestore
      await finalizeAgreement(agreementId, "hamim.leon@gmail.com", blob);

      const finalizedData = { ...formData, id: agreementId, status: "finalized" as const };
      setFormData(finalizedData);
      setFinalizeSuccess(true);
    } catch (err: any) {
      console.error("Finalize error:", err);
      setFinalizeError(err?.message || "Finalization encountered an issue. Please try again.");
    } finally {
      setFinalizing(false);
    }
  };

  // -------------------------------------------------------------
  // Dynamic Milestone Handlers
  // -------------------------------------------------------------
  const handleAddMilestone = () => {
    const currentMilestones = formData.compensation.milestones || [];
    const nextPhaseNumber = currentMilestones.length + 1;
    const newM: AgreementMilestone = {
      id: `m_${Date.now()}`,
      phaseNumber: nextPhaseNumber,
      phaseName: `Phase ${nextPhaseNumber}: Architectural Milestone`,
      description: "Implementation and testing of assigned subsystem.",
      deliverables: "Source code, unit tests, integration documentation",
      paymentAmount: 25000,
      acceptanceCriteria: "Automated regression pass, staging deployment, sign-off",
      paymentTrigger: "Upon review and formal acceptance sign-off",
      status: "pending",
    };

    const updated = [...currentMilestones, newM];
    const newTotal = updated.reduce((acc, curr) => acc + Number(curr.paymentAmount || 0), 0);

    setFormData((prev) => ({
      ...prev,
      compensation: {
        ...prev.compensation,
        milestones: updated,
        totalContractValue: newTotal,
      },
    }));
  };

  const handleUpdateMilestone = (index: number, field: keyof AgreementMilestone, value: any) => {
    const list = [...(formData.compensation.milestones || [])];
    list[index] = { ...list[index], [field]: value };
    const newTotal = list.reduce((acc, curr) => acc + Number(curr.paymentAmount || 0), 0);

    setFormData((prev) => ({
      ...prev,
      compensation: {
        ...prev.compensation,
        milestones: list,
        totalContractValue: newTotal,
      },
    }));
  };

  const handleRemoveMilestone = (index: number) => {
    const list = (formData.compensation.milestones || []).filter((_, i) => i !== index);
    const reordered = list.map((m, i) => ({ ...m, phaseNumber: i + 1 }));
    const newTotal = reordered.reduce((acc, curr) => acc + Number(curr.paymentAmount || 0), 0);

    setFormData((prev) => ({
      ...prev,
      compensation: {
        ...prev.compensation,
        milestones: reordered,
        totalContractValue: newTotal,
      },
    }));
  };

  // -------------------------------------------------------------
  // Dynamic Deliverable Handlers (Reorder, Duplicate, Add, Remove)
  // -------------------------------------------------------------
  const handleAddDeliverable = () => {
    const current = formData.deliverables || [];
    const newD: AgreementDeliverable = {
      id: `d_${Date.now()}`,
      title: `Deliverable ${current.length + 1}`,
      description: "Functional software module, subsystem, or architectural handover.",
      acceptanceCriteria: "Passes automated verification and formal technical review.",
      priority: "High",
      reviewPeriodDays: 10,
      acceptanceStatus: "pending",
      documentationRequired: true,
    };

    setFormData((prev) => ({
      ...prev,
      deliverables: [...current, newD],
    }));
  };

  const handleDuplicateDeliverable = (index: number) => {
    const current = formData.deliverables || [];
    const source = current[index];
    if (!source) return;

    const dup: AgreementDeliverable = {
      ...source,
      id: `d_${Date.now()}`,
      title: `${source.title} (Copy)`,
    };

    const nextList = [...current];
    nextList.splice(index + 1, 0, dup);

    setFormData((prev) => ({
      ...prev,
      deliverables: nextList,
    }));
  };

  const handleMoveDeliverable = (index: number, direction: "up" | "down") => {
    const list = [...(formData.deliverables || [])];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;

    setFormData((prev) => ({
      ...prev,
      deliverables: list,
    }));
  };

  const handleUpdateDeliverable = (index: number, field: keyof AgreementDeliverable, value: any) => {
    const list = [...(formData.deliverables || [])];
    list[index] = { ...list[index], [field]: value };
    setFormData((prev) => ({
      ...prev,
      deliverables: list,
    }));
  };

  const handleRemoveDeliverable = (index: number) => {
    const list = (formData.deliverables || []).filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      deliverables: list,
    }));
  };

  // -------------------------------------------------------------
  // Dynamic Profit Expense Handlers
  // -------------------------------------------------------------
  const handleToggleProfitExpense = (expense: string) => {
    const pt = formData.compensation.profitTerms;
    if (!pt) return;
    const list = pt.eligibleProjectExpenses || [];
    const updated = list.includes(expense)
      ? list.filter((e) => e !== expense)
      : [...list, expense];

    setFormData((prev) => ({
      ...prev,
      compensation: {
        ...prev.compensation,
        profitTerms: {
          ...pt,
          eligibleProjectExpenses: updated,
        },
      },
    }));
  };

  const handleAddCustomExpense = () => {
    if (!newExpenseInput.trim()) return;
    const pt = formData.compensation.profitTerms;
    if (!pt) return;

    const customList = pt.customExpenseCategories || [];
    if (!customList.includes(newExpenseInput.trim())) {
      const updatedCustom = [...customList, newExpenseInput.trim()];
      const updatedEligible = [...(pt.eligibleProjectExpenses || []), newExpenseInput.trim()];

      setFormData((prev) => ({
        ...prev,
        compensation: {
          ...prev.compensation,
          profitTerms: {
            ...pt,
            customExpenseCategories: updatedCustom,
            eligibleProjectExpenses: updatedEligible,
          },
        },
      }));
    }
    setNewExpenseInput("");
  };

  // Pre-existing IP handlers
  const handleAddPreExistingIp = () => {
    if (!newPreExistingIp.trim()) return;
    const current = formData.terms.preExistingIpDisclosure || [];
    setFormData((prev) => ({
      ...prev,
      terms: {
        ...prev.terms,
        preExistingIpDisclosure: [...current, newPreExistingIp.trim()],
      },
    }));
    setNewPreExistingIp("");
  };

  const handleRemovePreExistingIp = (idx: number) => {
    const current = formData.terms.preExistingIpDisclosure || [];
    setFormData((prev) => ({
      ...prev,
      terms: {
        ...prev.terms,
        preExistingIpDisclosure: current.filter((_: string, i: number) => i !== idx),
      },
    }));
  };

  return (
    <div className="space-y-8">
      {/* Executed Immutability Notice if editing an executed document */}
      {formData.status === "executed" && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-amber-400">lock</span>
            <div>
              <p className="font-bold text-sm">Agreement Is Legally Executed (Immutable)</p>
              <p className="text-xs text-gray-300">
                To amend commercial or legal provisions, create an official Addendum rather than modifying the executed contract.
              </p>
            </div>
          </div>
          <Link
            href={`/admin/agreements/${formData.id}/addendum`}
            className="px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-mono font-bold hover:bg-amber-300 transition-colors shrink-0"
          >
            Create Addendum →
          </Link>
        </div>
      )}

      {/* Step Wizard Header */}
      <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-4 sm:p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1 custom-scrollbar">
          {STEPS.map((s) => {
            const isActive = currentStep === s.id;
            const isCompleted = currentStep > s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setCurrentStep(s.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-lg shadow-cyan-500/10"
                    : isCompleted
                    ? "bg-white/[0.04] text-emerald-400 border border-emerald-500/30 font-medium"
                    : "bg-white/[0.02] text-gray-400 border border-white/[0.05] hover:bg-white/[0.05]"
                }`}
              >
                <span className="material-symbols-outlined text-base">
                  {isCompleted ? "check_circle" : s.icon}
                </span>
                <span>{s.id}. {s.label}</span>
              </button>
            );
          })}
        </div>
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

      {/* ------------------------------------------------------------------ */}
      {/* STEP 1: AGREEMENT TYPE & COMMERCIAL MODEL (8 MODELS) */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 1 && (
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-cyan-400 text-2xl">category</span>
              <span>Agreement Type & Commercial Model</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Select one of the 8 supported commercial structures. All clauses and validation rules adapt automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                type: "profit_participation" as AgreementType,
                title: "Profit Participation",
                desc: "Percentage of Net Distributable Project Profit upon monetization after agreed expense deductions.",
                badge: "Profit Share",
                icon: "trending_up",
                accent: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400",
              },
              {
                type: "revenue_sharing" as AgreementType,
                title: "Revenue Sharing",
                desc: "Direct percentage of Gross Realized Project Revenue without indirect expense subtractions.",
                badge: "Gross Top-Line",
                icon: "receipt_long",
                accent: "from-teal-500/20 to-emerald-500/10 border-teal-500/30 text-teal-400",
              },
              {
                type: "hourly" as AgreementType,
                title: "Hourly Billable",
                desc: "Billable time with verified hour tracking, periodic invoices, and maximum budget caps.",
                badge: "Time & Materials",
                icon: "timer",
                accent: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
              },
              {
                type: "fixed_completion" as AgreementType,
                title: "Fixed Completion",
                desc: "Lump-sum disbursement upon final technical delivery, testing, and sign-off.",
                badge: "Lump Sum",
                icon: "task_alt",
                accent: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
              },
              {
                type: "milestone" as AgreementType,
                title: "Milestone / Phase",
                desc: "Structured payment tranches released upon successful completion of defined phases.",
                badge: "Phased Delivery",
                icon: "flag",
                accent: "from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-400",
              },
              {
                type: "hybrid" as AgreementType,
                title: "Hybrid (Base + Profit)",
                desc: "Guaranteed base service fee paired with an ongoing project profit participation percentage.",
                badge: "Hybrid Model",
                icon: "hub",
                accent: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400",
              },
              {
                type: "retainer" as AgreementType,
                title: "Monthly Retainer",
                desc: "Fixed recurring monthly compensation for committed engineering availability and SLA.",
                badge: "Recurring Retainer",
                icon: "calendar_month",
                accent: "from-sky-500/20 to-cyan-500/10 border-sky-500/30 text-sky-400",
              },
              {
                type: "custom" as AgreementType,
                title: "Custom Terms",
                desc: "Bespoke negotiated commercial structure tailored for specific strategic partnerships.",
                badge: "Bespoke Terms",
                icon: "tune",
                accent: "from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-400",
              },
            ].map((card) => {
              const isSelected = formData.agreementType === card.type;
              return (
                <div
                  key={card.type}
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      agreementType: card.type,
                      agreementTypeLabel: AGREEMENT_TYPE_LABELS[card.type],
                    }))
                  }
                  className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                    isSelected
                      ? "bg-cyan-500/[0.08] border-cyan-400 shadow-[0_0_30px_rgba(56,189,248,0.15)] ring-1 ring-cyan-400"
                      : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15]"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${card.accent} border flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-lg">{card.icon}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-300">
                        {card.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm font-['Space_Grotesk'] group-hover:text-cyan-300 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 text-xs font-mono">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? "border-cyan-400 bg-cyan-400 text-black" : "border-gray-500"
                    }`}>
                      {isSelected && <span className="material-symbols-outlined text-[10px] font-bold">check</span>}
                    </div>
                    <span className={isSelected ? "text-cyan-300 font-semibold" : "text-gray-400"}>
                      {isSelected ? "Selected Model" : "Select"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 2: PROJECT INFORMATION & PRECISE TIMELINE DATES */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 2 && (
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-cyan-400 text-2xl">folder</span>
              <span>Project Information & Timeline</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Distinguish clearly between Agreement Effective Date, Work Commencement Date, Target Completion, and Planned Launch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Project Title / Name *
              </label>
              <input
                type="text"
                required
                value={formData.project.projectName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    project: { ...prev.project, projectName: e.target.value },
                  }))
                }
                placeholder="e.g. BLUME — AI Companion Engine"
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Project Domain / System Type
              </label>
              <input
                type="text"
                value={formData.project.projectType}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    project: { ...prev.project, projectType: e.target.value },
                  }))
                }
                placeholder="e.g. AI System / Web Platform / Microservice Architecture"
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
              />
            </div>

            {/* DATE DISTINCTION GRID */}
            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Agreement Effective Date *
              </label>
              <input
                type="date"
                required
                value={formData.project.agreementEffectiveDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    project: { ...prev.project, agreementEffectiveDate: e.target.value },
                  }))
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
              />
              <span className="text-[10px] font-mono text-gray-500">Date this legal document takes legal effect</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Work Commencement Date *
              </label>
              <input
                type="date"
                required
                value={formData.project.workCommencementDate || formData.project.agreementEffectiveDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    project: {
                      ...prev.project,
                      workCommencementDate: e.target.value,
                      startDate: e.target.value,
                    },
                  }))
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
              />
              <span className="text-[10px] font-mono text-gray-500">Date on which active engineering services begin</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Target Completion Date *
              </label>
              <input
                type="date"
                required
                value={formData.project.targetCompletionDate || formData.project.expectedCompletionDate || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    project: {
                      ...prev.project,
                      targetCompletionDate: e.target.value,
                      expectedCompletionDate: e.target.value,
                    },
                  }))
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
              />
              <span className="text-[10px] font-mono text-gray-500">Scheduled milestone completion milestone</span>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Planned Production-Release Target
              </label>
              <input
                type="date"
                value={formData.project.plannedLaunchDate || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    project: { ...prev.project, plannedLaunchDate: e.target.value },
                  }))
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
              />
              <span className="text-[10px] font-mono text-gray-500">Estimated launch (never auto-treated as actual launch)</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
              Technical Scope & Architecture Overview
            </label>
            <textarea
              rows={3}
              value={formData.project.technicalScopeAndArchitecture || formData.project.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  project: {
                    ...prev.project,
                    technicalScopeAndArchitecture: e.target.value,
                    description: e.target.value,
                  },
                }))
              }
              placeholder="Outline project architecture, technology stack, microservices, APIs, and functional boundaries..."
              className="w-full bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl p-4 text-sm text-white focus:outline-none transition-colors resize-none leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
              Additional Project Notes
            </label>
            <input
              type="text"
              value={formData.project.additionalNotes || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  project: { ...prev.project, additionalNotes: e.target.value },
                }))
              }
              placeholder="Operational assumptions, staging environments, repository locations..."
              className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono text-xs"
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 3: CONTRACTING PARTIES & CONTRIBUTOR ENTITY */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 3 && (
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-8">
          {/* Section A: Company / Contracting Entity */}
          <div className="space-y-4">
            <div className="border-b border-white/[0.08] pb-3">
              <h2 className="text-lg font-bold font-['Space_Grotesk'] text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-xl">domain</span>
                <span>Contracting Entity (Company / DevEngine)</span>
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Authorized company legal entity executing the agreement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Company Legal Entity *
                </label>
                <input
                  type="text"
                  required
                  value={formData.devengine?.legalEntityName || "DevEngine Ltd."}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      devengine: { ...prev.devengine, legalEntityName: e.target.value },
                    }))
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Authorized Signatory Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.devengine?.authorizedSignatoryName || "Hamim Leon"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      devengine: { ...prev.devengine, authorizedSignatoryName: e.target.value },
                    }))
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Signatory Designation / Capacity *
                </label>
                <input
                  type="text"
                  required
                  value={formData.devengine?.authorizedSignatoryTitle || "Founder & Chief Architect"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      devengine: { ...prev.devengine, authorizedSignatoryTitle: e.target.value },
                    }))
                  }
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section B: Contributor Details */}
          <div className="space-y-4">
            <div className="border-b border-white/[0.08] pb-3">
              <h2 className="text-lg font-bold font-['Space_Grotesk'] text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-cyan-400 text-xl">badge</span>
                <span>Contributor / Counterparty Details</span>
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Legal identity, display alias, and verified contact coordinates.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Party Type *
                </label>
                <select
                  value={formData.developer.partyType || "individual"}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      developer: { ...prev.developer, partyType: e.target.value as any },
                    }))
                  }
                  aria-label="Party Type"
                  className="w-full h-11 bg-[#090d16] border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-xs text-white focus:outline-none font-mono"
                >
                  <option value="individual">Individual Professional</option>
                  <option value="registered_company">Registered Corporate Entity</option>
                  <option value="entity">Independent Studio / Firm</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.developer.legalName || formData.developer.fullName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      developer: {
                        ...prev.developer,
                        legalName: e.target.value,
                        fullName: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g. Sabiha Jahan"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Professional / Display Alias
                </label>
                <input
                  type="text"
                  value={formData.developer.professionalName || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      developer: { ...prev.developer, professionalName: e.target.value },
                    }))
                  }
                  placeholder="e.g. Mishu"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Contributor Role *
                </label>
                <input
                  type="text"
                  required
                  value={formData.developer.role}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      developer: { ...prev.developer, role: e.target.value },
                    }))
                  }
                  placeholder="e.g. AI Development Partner — BLUME"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.developer.email}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      developer: { ...prev.developer, email: e.target.value },
                    }))
                  }
                  placeholder="e.g. contributor@example.com"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Telephone / WhatsApp
                </label>
                <input
                  type="text"
                  value={formData.developer.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      developer: { ...prev.developer, phone: e.target.value },
                    }))
                  }
                  placeholder="e.g. +880 1700-000000"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Physical / Residential Address
                </label>
                <input
                  type="text"
                  value={formData.developer.address}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      developer: { ...prev.developer, address: e.target.value },
                    }))
                  }
                  placeholder="e.g. Dhaka, Bangladesh"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  National ID / Passport / Tax Identification
                </label>
                <input
                  type="text"
                  value={formData.developer.identificationId || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      developer: { ...prev.developer, identificationId: e.target.value },
                    }))
                  }
                  placeholder="Optional identifier for formal verification"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono text-xs"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 4: COMPENSATION & FINANCIAL TERMS */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 4 && (
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="border-b border-white/[0.08] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
                <span className="material-symbols-outlined text-cyan-400 text-2xl">payments</span>
                <span>Financial Terms: {AGREEMENT_TYPE_LABELS[formData.agreementType]}</span>
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Configure rates, duration model, post-service treatment, and accounting formulas.
              </p>
            </div>
            {/* Currency switcher */}
            <div className="flex items-center gap-2 bg-black/40 border border-white/[0.08] rounded-xl p-1 self-start sm:self-auto font-mono text-xs">
              {["BDT", "USD", "EUR", "GBP"].map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      compensation: { ...prev.compensation, currency: cur },
                    }))
                  }
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    formData.compensation.currency === cur ? "bg-cyan-500 text-black font-bold" : "text-gray-400"
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          {/* PROFIT PARTICIPATION & HYBRID FIELDS */}
          {(formData.agreementType === "profit_participation" || formData.agreementType === "hybrid" || formData.agreementType === "revenue_sharing") && (
            <div className="space-y-6">
              {/* Important Legal Notice Banner */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">shield</span>
                  <span>Legal Distinction: Project Participation ≠ Corporate Equity</span>
                </p>
                <p className="text-gray-300 leading-relaxed">
                  This model creates a contractual economic entitlement in eligible project proceeds. Default corporate equity is <strong>NO</strong> unless an explicit corporate equity arrangement is executed.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                      Participation Percentage *
                    </label>
                    <span className="text-cyan-400 font-mono font-bold text-base">
                      {formData.compensation.profitTerms?.participationPercentage ?? 15}%
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={formData.compensation.profitTerms?.participationPercentage ?? 15}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        compensation: {
                          ...prev.compensation,
                          profitTerms: {
                            ...prev.compensation.profitTerms!,
                            participationPercentage: Number(e.target.value),
                          },
                        },
                      }))
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>Common: 5%</span>
                    <span>10%</span>
                    <span>15%</span>
                    <span>20%</span>
                    <span>25%</span>
                  </div>
                </div>

                {/* DURATION MODEL CONFIGURATION (Fix for hardcoded 24m) */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Participation Duration Model *
                  </label>
                  <select
                    value={formData.compensation.profitTerms?.durationModel || "ongoing_indefinite"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        compensation: {
                          ...prev.compensation,
                          profitTerms: {
                            ...prev.compensation.profitTerms!,
                            durationModel: e.target.value as ProfitDurationModel,
                            participationDurationDescription: PROFIT_DURATION_LABELS[e.target.value as ProfitDurationModel],
                          },
                        },
                      }))
                    }
                    aria-label="Participation Duration Model"
                    className="w-full h-11 bg-[#090d16] border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-xs text-white focus:outline-none font-mono"
                  >
                    {Object.entries(PROFIT_DURATION_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {formData.compensation.profitTerms?.durationModel === "ongoing_indefinite"
                      ? "✓ Ongoing: No fixed expiry date or 24-month sunset."
                      : "Configured term limit will apply."}
                  </span>
                </div>

                {/* POST-SERVICE TREATMENT (Fix for hardcoded 12m limit) */}
                <div className="space-y-2">
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Post-Service Separation Treatment *
                  </label>
                  <select
                    value={formData.compensation.profitTerms?.postServiceTreatment || "full_continuing"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        compensation: {
                          ...prev.compensation,
                          profitTerms: {
                            ...prev.compensation.profitTerms!,
                            postServiceTreatment: e.target.value as PostServiceTreatment,
                          },
                        },
                      }))
                    }
                    aria-label="Post-Service Separation Treatment"
                    className="w-full h-11 bg-[#090d16] border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-xs text-white focus:outline-none font-mono"
                  >
                    {Object.entries(POST_SERVICE_TREATMENT_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] font-mono text-cyan-400">
                    {formData.compensation.profitTerms?.postServiceTreatment === "full_continuing"
                      ? "✓ Entitlement survives end of active service."
                      : "Separation adjustments apply."}
                  </span>
                </div>
              </div>

              {/* Number of months input if a fixed period model is selected */}
              {(formData.compensation.profitTerms?.durationModel === "fixed_period_from_release" ||
                formData.compensation.profitTerms?.durationModel === "fixed_period_from_start") && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="space-y-2">
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                      Fixed Participation Duration (Months)
                    </label>
                    <input
                      type="number"
                      value={formData.compensation.profitTerms?.participationDurationMonths ?? 24}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          compensation: {
                            ...prev.compensation,
                            profitTerms: {
                              ...prev.compensation.profitTerms!,
                              participationDurationMonths: Number(e.target.value),
                            },
                          },
                        }))
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                      Post-Service Sunset Window (Months)
                    </label>
                    <input
                      type="number"
                      value={formData.compensation.profitTerms?.postServiceSunsetMonths ?? 12}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          compensation: {
                            ...prev.compensation,
                            profitTerms: {
                              ...prev.compensation.profitTerms!,
                              postServiceSunsetMonths: Number(e.target.value),
                            },
                          },
                        }))
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Profit Calculation Basis & Payment Frequency */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Profit / Revenue Basis Definition
                  </label>
                  <input
                    type="text"
                    value={formData.compensation.profitTerms?.profitBasis || "Net Distributable Project Profit"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        compensation: {
                          ...prev.compensation,
                          profitTerms: {
                            ...prev.compensation.profitTerms!,
                            profitBasis: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Distribution Frequency & Schedule
                  </label>
                  <select
                    value={formData.compensation.profitTerms?.paymentFrequency || "Quarterly"}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        compensation: {
                          ...prev.compensation,
                          profitTerms: {
                            ...prev.compensation.profitTerms!,
                            paymentFrequency: e.target.value,
                          },
                        },
                      }))
                    }
                    aria-label="Distribution Frequency & Schedule"
                    className="w-full h-11 bg-[#090d16] border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-xs text-white focus:outline-none font-mono"
                  >
                    <option value="Quarterly within 15 days following calendar quarter-end">Quarterly (Standard)</option>
                    <option value="Monthly within 10 days of calendar month-end">Monthly</option>
                    <option value="Bi-annually within 30 days of half-year close">Bi-annually</option>
                    <option value="Annually upon audited fiscal reconciliation">Annually</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Payment Disbursement Grace Period
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={formData.compensation.profitTerms?.paymentDeadlineDays ?? 15}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          compensation: {
                            ...prev.compensation,
                            profitTerms: {
                              ...prev.compensation.profitTerms!,
                              paymentDeadlineDays: Number(e.target.value),
                            },
                          },
                        }))
                      }
                      className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none font-mono"
                    />
                    <span className="text-xs font-mono text-gray-400 shrink-0">Days post-quarter</span>
                  </div>
                </div>
              </div>

              {/* Deductible Project Expenses Checklist & Custom Category Adder */}
              {formData.agreementType !== "revenue_sharing" && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                      Deductible Project Expenses (Net Distributable Profit Subtractions)
                    </label>
                    <span className="text-[10px] font-mono text-gray-500">Toggle or add categories below</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {Array.from(new Set([
                      ...DEFAULT_PROFIT_EXPENSES,
                      ...(formData.compensation.profitTerms?.customExpenseCategories || []),
                    ])).map((expense) => {
                      const isChecked = formData.compensation.profitTerms?.eligibleProjectExpenses?.includes(expense);
                      return (
                        <div
                          key={expense}
                          onClick={() => handleToggleProfitExpense(expense)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                            isChecked
                              ? "bg-cyan-500/[0.08] border-cyan-500/40 text-white"
                              : "bg-black/30 border-white/[0.05] text-gray-400 hover:text-gray-300"
                          }`}
                        >
                          <span className={`material-symbols-outlined text-base ${isChecked ? "text-cyan-400" : "text-gray-600"}`}>
                            {isChecked ? "check_box" : "check_box_outline_blank"}
                          </span>
                          <span className="text-xs font-mono">{expense}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Custom Expense Input */}
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="text"
                      value={newExpenseInput}
                      onChange={(e) => setNewExpenseInput(e.target.value)}
                      placeholder="Add custom expense (e.g. Specialized Legal Compliance, GPU Cluster Leases)..."
                      className="flex-1 h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomExpense}
                      className="px-3.5 h-10 rounded-xl bg-white/[0.08] hover:bg-cyan-500/20 text-white hover:text-cyan-300 text-xs font-mono border border-white/[0.1] transition-colors"
                    >
                      + Add Category
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HOURLY FIELDS */}
          {formData.agreementType === "hourly" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Hourly Rate ({formData.compensation.currency}) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.compensation.hourlyRate || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      compensation: { ...prev.compensation, hourlyRate: Number(e.target.value) },
                    }))
                  }
                  placeholder="e.g. 500"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Estimated Billable Hours
                </label>
                <input
                  type="number"
                  value={formData.compensation.estimatedHours || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      compensation: { ...prev.compensation, estimatedHours: Number(e.target.value) },
                    }))
                  }
                  placeholder="e.g. 40"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Maximum Approved Cap Hours
                </label>
                <input
                  type="number"
                  value={formData.compensation.maxApprovedHours || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      compensation: { ...prev.compensation, maxApprovedHours: Number(e.target.value) },
                    }))
                  }
                  placeholder="e.g. 80"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>
          )}

          {/* FIXED / HYBRID BASE FIELDS */}
          {(formData.agreementType === "fixed_completion" || formData.agreementType === "hybrid") && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  {formData.agreementType === "hybrid" ? "Base Fixed Payment" : "Total Project Completion Fee"} ({formData.compensation.currency}) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.compensation.fixedAmount || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      compensation: {
                        ...prev.compensation,
                        fixedAmount: Number(e.target.value),
                        totalContractValue: Number(e.target.value),
                      },
                    }))
                  }
                  placeholder="e.g. 50000"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Payment Disbursement Method
                </label>
                <input
                  type="text"
                  value={formData.compensation.paymentMethod || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      compensation: { ...prev.compensation, paymentMethod: e.target.value },
                    }))
                  }
                  placeholder="e.g. Bank Wire / BEFTN / bKash Commercial Transfer"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}

          {/* RETAINER FIELDS */}
          {formData.agreementType === "retainer" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Monthly Retainer Amount ({formData.compensation.currency}) *
                </label>
                <input
                  type="number"
                  required
                  value={formData.compensation.monthlyRetainerAmount || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      compensation: { ...prev.compensation, monthlyRetainerAmount: Number(e.target.value) },
                    }))
                  }
                  placeholder="e.g. 30000"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Committed Availability Hours / Week
                </label>
                <input
                  type="number"
                  value={formData.compensation.availabilityHoursPerWeek || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      compensation: { ...prev.compensation, availabilityHoursPerWeek: Number(e.target.value) },
                    }))
                  }
                  placeholder="e.g. 20"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Additional Overtime Rate / Hr ({formData.compensation.currency})
                </label>
                <input
                  type="number"
                  value={formData.compensation.additionalHourlyRate || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      compensation: { ...prev.compensation, additionalHourlyRate: Number(e.target.value) },
                    }))
                  }
                  placeholder="e.g. 600"
                  className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
                />
              </div>
            </div>
          )}

          {/* CUSTOM COMMERCIAL TERMS */}
          {formData.agreementType === "custom" && (
            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Custom Commercial Terms Text *
              </label>
              <textarea
                rows={4}
                value={formData.compensation.customTermsText || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    compensation: { ...prev.compensation, customTermsText: e.target.value },
                  }))
                }
                placeholder="Detail agreed pricing formula, payment triggers, currencies, invoicing windows, and settlement clauses..."
                className="w-full bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl p-4 text-sm text-white focus:outline-none transition-colors leading-relaxed font-mono text-xs"
              />
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 5: SCOPE, DELIVERABLES & MILESTONES */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 5 && (
        <div className="space-y-8">
          {/* MILESTONE BUILDER (if milestone agreement) */}
          {formData.agreementType === "milestone" && (
            <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div>
                  <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-cyan-400 text-2xl">flag</span>
                    <span>Dynamic Phase & Milestone Builder</span>
                  </h2>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    Tranches and payment amounts sum automatically.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-bold">
                    Total: {formData.compensation.currency} {Number(formData.compensation.totalContractValue || 0).toLocaleString()}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMilestone}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-cyan-500/20 text-white hover:text-cyan-300 font-mono text-xs font-semibold transition-all border border-white/[0.1] flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Add Phase</span>
                  </button>
                </div>
              </div>

              {/* Milestones List */}
              <div className="space-y-4">
                {(formData.compensation.milestones || []).map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4 relative group"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                      <span className="font-mono text-xs text-cyan-400 font-bold uppercase tracking-wider">
                        Phase {m.phaseNumber} Configuration
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestone(idx)}
                        className="text-gray-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                        title="Remove Phase"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-gray-400 uppercase">Phase Name</label>
                        <input
                          type="text"
                          value={m.phaseName}
                          onChange={(e) => handleUpdateMilestone(idx, "phaseName", e.target.value)}
                          className="w-full h-10 bg-black/50 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-gray-400 uppercase">Disbursement Amount ({formData.compensation.currency})</label>
                        <input
                          type="number"
                          value={m.paymentAmount || ""}
                          onChange={(e) => handleUpdateMilestone(idx, "paymentAmount", Number(e.target.value))}
                          className="w-full h-10 bg-black/50 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-gray-400 uppercase">Target Completion Date</label>
                        <input
                          type="date"
                          value={m.expectedCompletionDate || ""}
                          onChange={(e) => handleUpdateMilestone(idx, "expectedCompletionDate", e.target.value)}
                          className="w-full h-10 bg-black/50 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-gray-400 uppercase">Deliverables Expected</label>
                        <input
                          type="text"
                          value={m.deliverables}
                          onChange={(e) => handleUpdateMilestone(idx, "deliverables", e.target.value)}
                          className="w-full h-10 bg-black/50 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-mono text-gray-400 uppercase">Acceptance Benchmark Criteria</label>
                        <input
                          type="text"
                          value={m.acceptanceCriteria}
                          onChange={(e) => handleUpdateMilestone(idx, "acceptanceCriteria", e.target.value)}
                          className="w-full h-10 bg-black/50 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DELIVERABLES BUILDER (Reorder, Duplicate, Add, Remove) */}
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-cyan-400 text-2xl">checklist</span>
                  <span>Scope of Work & Formal Deliverables</span>
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  Add, edit, reorder, duplicate, or delete deliverables with explicit review windows and criteria.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddDeliverable}
                className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-cyan-500/20 text-white hover:text-cyan-300 font-mono text-xs font-semibold transition-all border border-white/[0.1] flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Add Deliverable</span>
              </button>
            </div>

            <div className="space-y-4">
              {(formData.deliverables || []).map((d, idx) => (
                <div
                  key={d.id}
                  className="p-5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-white font-bold">
                        #{idx + 1}. {d.title || "Untitled Deliverable"}
                      </span>
                      {/* Priority pill */}
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        d.priority === "Critical" ? "bg-rose-500/20 border-rose-500/40 text-rose-300" :
                        d.priority === "High" ? "bg-amber-500/20 border-amber-500/40 text-amber-300" :
                        "bg-cyan-500/20 border-cyan-500/40 text-cyan-300"
                      }`}>
                        {d.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveDeliverable(idx, "up")}
                        className="text-gray-400 hover:text-white p-1 disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_upward</span>
                      </button>
                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={idx === (formData.deliverables?.length || 1) - 1}
                        onClick={() => handleMoveDeliverable(idx, "down")}
                        className="text-gray-400 hover:text-white p-1 disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <span className="material-symbols-outlined text-sm">arrow_downward</span>
                      </button>
                      {/* Duplicate */}
                      <button
                        type="button"
                        onClick={() => handleDuplicateDeliverable(idx)}
                        className="text-gray-400 hover:text-cyan-300 p-1 cursor-pointer"
                        title="Duplicate"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleRemoveDeliverable(idx)}
                        className="text-gray-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono text-gray-400 uppercase">Deliverable Title</label>
                      <input
                        type="text"
                        value={d.title}
                        onChange={(e) => handleUpdateDeliverable(idx, "title", e.target.value)}
                        className="w-full h-10 bg-black/50 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono text-gray-400 uppercase">Priority Level</label>
                      <select
                        value={d.priority}
                        onChange={(e) => handleUpdateDeliverable(idx, "priority", e.target.value)}
                        aria-label="Priority Level"
                        className="w-full h-10 bg-[#090d16] border border-white/[0.08] focus:border-cyan-400 rounded-xl px-3 text-xs text-white focus:outline-none font-mono"
                      >
                        <option value="Critical">Critical</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono text-gray-400 uppercase">Target Deadline</label>
                      <input
                        type="text"
                        value={d.deadline || ""}
                        onChange={(e) => handleUpdateDeliverable(idx, "deadline", e.target.value)}
                        placeholder="e.g. Sprint 2 / Dec 15"
                        className="w-full h-10 bg-black/50 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono text-gray-400 uppercase">Technical Description</label>
                      <input
                        type="text"
                        value={d.description}
                        onChange={(e) => handleUpdateDeliverable(idx, "description", e.target.value)}
                        className="w-full h-10 bg-black/50 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-mono text-gray-400 uppercase">Acceptance Benchmark Criteria</label>
                      <input
                        type="text"
                        value={d.acceptanceCriteria}
                        onChange={(e) => handleUpdateDeliverable(idx, "acceptanceCriteria", e.target.value)}
                        className="w-full h-10 bg-black/50 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 6: TERMS & LEGAL PARAMETERS (CONFIGURABLE) */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 6 && (
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-8">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-cyan-400 text-2xl">gavel</span>
              <span>Terms & Legal Parameters</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Configure IP rights, pre-existing IP, warranty periods, governing law, and dispute resolution.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Bug-Fix Warranty (Days)
              </label>
              <input
                type="number"
                value={formData.terms.bugFixPeriodDays}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    terms: { ...prev.terms, bugFixPeriodDays: Number(e.target.value) },
                  }))
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Acceptance Review Window (Days)
              </label>
              <input
                type="number"
                value={formData.terms.acceptancePeriodDays}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    terms: { ...prev.terms, acceptancePeriodDays: Number(e.target.value) },
                  }))
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Confidentiality Duration (Years)
              </label>
              <input
                type="number"
                value={formData.terms.confidentialityDurationYears}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    terms: { ...prev.terms, confidentialityDurationYears: Number(e.target.value) },
                  }))
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Termination Notice (Days)
              </label>
              <input
                type="number"
                value={formData.terms.terminationNoticeDays}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    terms: { ...prev.terms, terminationNoticeDays: Number(e.target.value) },
                  }))
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Governing Law *
              </label>
              <input
                type="text"
                value={formData.terms.governingLaw || "Bangladesh"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    terms: { ...prev.terms, governingLaw: e.target.value },
                  }))
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Jurisdiction Court *
              </label>
              <input
                type="text"
                value={formData.terms.jurisdiction || "Courts of Dhaka, Bangladesh"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    terms: { ...prev.terms, jurisdiction: e.target.value },
                  }))
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Pre-Existing IP Disclosure Section */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
              Pre-Existing Intellectual Property Disclosure (Excluded from Company Assignment)
            </label>
            <div className="flex flex-wrap gap-2">
              {(formData.terms.preExistingIpDisclosure || []).map((ip: string, idx: number) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs font-mono text-gray-200"
                >
                  <span>{ip}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePreExistingIp(idx)}
                    className="text-gray-400 hover:text-rose-400 ml-1"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPreExistingIp}
                onChange={(e) => setNewPreExistingIp(e.target.value)}
                placeholder="Disclose contributor pre-existing libraries, tools, or models..."
                className="flex-1 h-10 bg-black/40 border border-white/[0.08] rounded-xl px-3 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
              />
              <button
                type="button"
                onClick={handleAddPreExistingIp}
                className="px-3.5 h-10 rounded-xl bg-white/[0.08] hover:bg-cyan-500/20 text-white hover:text-cyan-300 text-xs font-mono border border-white/[0.1] transition-colors"
              >
                + Disclose IP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 7: REVIEW, PRE-FLIGHT VALIDATION & LIFECYCLE */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 7 && (
        <div className="space-y-6">
          {/* Validation Report Banner */}
          {!validation.valid ? (
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="material-symbols-outlined text-base">error</span>
                <span>Pre-Flight Validation Blocked ({validation.errors.length} Issues)</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2.5">
              <span className="material-symbols-outlined text-base text-emerald-400">check_circle</span>
              <span className="font-bold">Pre-Flight Structural Validation Passed: Agreement is consistent and ready.</span>
            </div>
          )}

          {/* Validation Warnings (requires admin acknowledgment) */}
          {validation.warnings.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="material-symbols-outlined text-base">warning</span>
                <span>Commercial & Legal Warnings ({validation.warnings.length})</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1 text-gray-300">
                {validation.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
              <label className="flex items-center gap-2.5 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={legalWarningsAcknowledged}
                  onChange={(e) => setLegalWarningsAcknowledged(e.target.checked)}
                  className="rounded border-white/20 text-cyan-400 focus:ring-0 bg-black/40"
                />
                <span className="text-white font-semibold">
                  I acknowledge these commercial terms and confirm administrative sign-off.
                </span>
              </label>
            </div>
          )}

          {/* Human-Readable Review Bento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] space-y-3">
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                Project & Scope
              </span>
              <p className="text-lg font-bold font-['Space_Grotesk'] text-white">
                {formData.project.projectName || "Untitled Project"}
              </p>
              <div className="text-xs font-mono text-gray-400 space-y-1">
                <p>Model: {formData.agreementTypeLabel}</p>
                <p>Effective Date: {formData.project.agreementEffectiveDate}</p>
                <p>Commencement: {formData.project.workCommencementDate || formData.project.agreementEffectiveDate}</p>
                <p>Deliverables: {formData.deliverables.length} Defined</p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] space-y-3">
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                Contracting Parties
              </span>
              <p className="text-lg font-bold font-['Space_Grotesk'] text-white">
                {formData.developer.legalName || formData.developer.fullName || "Unset"}
              </p>
              <div className="text-xs font-mono text-gray-400 space-y-1">
                <p>Entity: {formData.devengine?.legalEntityName || "DevEngine Ltd."}</p>
                <p>Role: {formData.developer.role}</p>
                <p>Email: {formData.developer.email}</p>
                <p>Party Type: {formData.developer.partyType}</p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] space-y-3">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                Commercial Terms
              </span>
              <p className="text-lg font-bold font-['Space_Grotesk'] text-white">
                {formData.agreementType === "profit_participation" || formData.agreementType === "revenue_sharing"
                  ? `${formData.compensation.profitTerms?.participationPercentage}% ${formData.agreementTypeLabel}`
                  : formData.agreementType === "hourly"
                  ? `${formData.compensation.currency} ${formData.compensation.hourlyRate}/hr`
                  : `${formData.compensation.currency} ${Number(formData.compensation.totalContractValue || formData.compensation.fixedAmount || 0).toLocaleString()}`}
              </p>
              <div className="text-xs font-mono text-gray-400 space-y-1">
                <p>Currency: {formData.compensation.currency}</p>
                <p>Duration: {formData.compensation.profitTerms?.durationModel ? PROFIT_DURATION_LABELS[formData.compensation.profitTerms.durationModel] : "Per Project"}</p>
                <p>Status: <span className="text-cyan-300 font-bold uppercase">{formData.status}</span></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* PINNED BOTTOM ACTION BAR */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky bottom-4 z-40 p-4 sm:p-5 rounded-2xl bg-[#0c0c16]/98 border border-white/[0.12] backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Step navigation */}
        <div className="flex items-center gap-3">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
              className="px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-gray-300 hover:text-white font-mono text-xs transition-all border border-white/[0.08] cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>Previous</span>
            </button>
          )}

          {currentStep < 7 && (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => Math.min(7, prev + 1))}
              className="px-4 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] text-white font-mono text-xs transition-all border border-white/[0.1] cursor-pointer flex items-center gap-1.5 font-semibold"
            >
              <span>Next Step</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          )}

          <span className="text-gray-500 text-xs font-mono hidden md:inline">
            Step {currentStep} of 7
          </span>
        </div>

        {/* Right: Save Draft / Update Changes, Preview, Finalize */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => handleSaveDraft(false)}
            disabled={saving}
            className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-gray-200 hover:text-white font-mono text-xs transition-all border border-white/[0.1] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-base">save</span>
            )}
            <span>{isEditing ? "Save Changes" : "Save Draft"}</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs font-semibold tracking-wider transition-all border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            <span>Preview Document</span>
          </button>

          {formData.status !== "finalized" && formData.status !== "executed" && (
            <button
              type="button"
              onClick={() => setFinalizeModalOpen(true)}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-black font-mono text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">verified</span>
              <span>Finalize</span>
            </button>
          )}
        </div>
      </div>

      {/* Internal Operational Disclaimer */}
      <p className="text-[11px] font-mono text-gray-500 text-center px-4 leading-relaxed">
        Agreements generated by DevEngine Engine. Administrative modifications to executed agreements require formal addenda.
      </p>

      {/* Preview Modal */}
      <AgreementPreviewModal
        record={formData}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onFinalize={() => {
          setPreviewOpen(false);
          setFinalizeModalOpen(true);
        }}
        isFinalizing={finalizing}
      />

      {/* Finalize Modal */}
      <FinalizeModal
        record={formData}
        isOpen={finalizeModalOpen}
        onClose={() => {
          setFinalizeModalOpen(false);
          setFinalizeSuccess(false);
          setFinalizeError(null);
        }}
        onConfirm={handleConfirmFinalize}
        isFinalizing={finalizing}
        isSuccess={finalizeSuccess}
        errorMessage={finalizeError}
        onDownloadPdf={() => generateAgreementPdf(formData, { download: true })}
        onCloseAndNavigate={() => {
          setFinalizeModalOpen(false);
          router.push("/admin/agreements");
        }}
      />
    </div>
  );
}
