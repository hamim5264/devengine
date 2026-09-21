import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  AgreementRecord,
  AgreementType,
  AgreementMilestone,
  AgreementDeliverable,
  AGREEMENT_TYPE_LABELS,
  DEFAULT_PROFIT_EXPENSES,
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
  { id: 1, label: "Type", icon: "category" },
  { id: 2, label: "Project", icon: "folder" },
  { id: 3, label: "Contributor", icon: "person" },
  { id: 4, label: "Compensation", icon: "payments" },
  { id: 5, label: "Scope & Milestones", icon: "checklist" },
  { id: 6, label: "Terms & Legal", icon: "gavel" },
  { id: 7, label: "Review", icon: "fact_check" },
];

export default function AgreementForm({ initialData, isEditing = false }: AgreementFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<AgreementRecord>(initialData);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [notice, setNotice] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  // Modals
  const [previewOpen, setPreviewOpen] = useState(false);
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [finalizeSuccess, setFinalizeSuccess] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Validation state
  const validation = validateAgreement(formData);

  // Sync initialData if editing
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  // Handle Save Draft
  const handleSaveDraft = async (silent = false) => {
    try {
      setSaving(true);
      if (isEditing && formData.id) {
        await updateAgreement(formData.id, formData);
        if (!silent) {
          setNotice({ text: "Draft changes saved successfully to Firestore.", type: "success" });
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
          setNotice({ text: "Draft created successfully!", type: "success" });
        }
        router.replace(`/admin/agreements/${createdId}/edit`);
      }
    } catch (err: any) {
      console.error("Save draft error:", err);
      if (!silent) {
        setNotice({ text: err?.message || "Failed to save draft.", type: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  // Handle Finalize Execution
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

      // Ensure record is saved in Firestore first
      if (!isEditing || !agreementId) {
        const nextNumber = formData.agreementNumber || (await generateNextAgreementNumber());
        agreementId = await createAgreement({
          ...formData,
          agreementNumber: nextNumber,
        });
      } else {
        await updateAgreement(agreementId, formData);
      }

      // Generate PDF Blob for Storage persistence (and trigger browser download)
      const { blob } = await generateAgreementPdf(
        { ...formData, id: agreementId, status: "finalized" },
        { download: true, returnBlob: true }
      );

      // Finalize record in Firestore with 4s timeout protection
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
      phaseName: `Phase ${nextPhaseNumber}: Deliverables`,
      description: "Implementation of assigned module.",
      deliverables: "Source code, unit tests, pull request",
      paymentAmount: 20000,
      acceptanceCriteria: "Passes automated verification and code review",
      paymentTrigger: "Upon review and acceptance sign-off",
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
  // Dynamic Deliverable Handlers
  // -------------------------------------------------------------
  const handleAddDeliverable = () => {
    const current = formData.deliverables || [];
    const newD: AgreementDeliverable = {
      id: `d_${Date.now()}`,
      title: `Deliverable ${current.length + 1}`,
      description: "Functional software module or subsystem implementation.",
      acceptanceCriteria: "Clean modular code, zero defects, acceptance approved.",
      priority: "High",
    };

    setFormData((prev) => ({
      ...prev,
      deliverables: [...current, newD],
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

  // Toggle profit expense
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

  return (
    <div className="space-y-8">
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
      {/* STEP 1: AGREEMENT TYPE SELECTION */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 1 && (
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-cyan-400 text-2xl">category</span>
              <span>Agreement Type & Commercial Model</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Select a commercial model. Form fields and clauses adjust automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                type: "profit_participation" as AgreementType,
                title: "Project Profit Participation",
                desc: "Earn a contractual percentage of Net Distributable Project Profit upon monetization.",
                badge: "Revenue Share",
                icon: "trending_up",
                accent: "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400",
              },
              {
                type: "hourly" as AgreementType,
                title: "Hourly Billable Agreement",
                desc: "Bill for verified hours worked with optional cap limits.",
                badge: "Time & Materials",
                icon: "timer",
                accent: "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400",
              },
              {
                type: "milestone" as AgreementType,
                title: "Phase / Milestone Based",
                desc: "Release payments upon completion and sign-off of project phases.",
                badge: "Phased Delivery",
                icon: "flag",
                accent: "from-indigo-500/20 to-purple-500/10 border-indigo-500/30 text-indigo-400",
              },
              {
                type: "fixed_completion" as AgreementType,
                title: "Fixed Completion Payment",
                desc: "Fixed lump-sum payment upon final handover and acceptance.",
                badge: "Lump Sum",
                icon: "task_alt",
                accent: "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400",
              },
              {
                type: "hybrid" as AgreementType,
                title: "Hybrid (Base + Profit Share)",
                desc: "Guaranteed base fee plus ongoing project profit share.",
                badge: "Hybrid Model",
                icon: "hub",
                accent: "from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400",
              },
              {
                type: "retainer" as AgreementType,
                title: "Monthly Retainer",
                desc: "Fixed recurring monthly fee for dedicated engineering hours.",
                badge: "Recurring Retainer",
                icon: "calendar_month",
                accent: "from-sky-500/20 to-cyan-500/10 border-sky-500/30 text-sky-400",
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
                  className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 group ${
                    isSelected
                      ? "bg-cyan-500/[0.08] border-cyan-400 shadow-[0_0_30px_rgba(56,189,248,0.15)] ring-1 ring-cyan-400"
                      : "bg-white/[0.02] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.15]"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${card.accent} border flex items-center justify-center`}>
                        <span className="material-symbols-outlined text-xl">{card.icon}</span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-300">
                        {card.badge}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base font-['Space_Grotesk'] group-hover:text-cyan-300 transition-colors">
                        {card.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 text-xs font-mono">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      isSelected ? "border-cyan-400 bg-cyan-400 text-black" : "border-gray-500"
                    }`}>
                      {isSelected && <span className="material-symbols-outlined text-xs font-bold">check</span>}
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
      {/* STEP 2: PROJECT DETAILS */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 2 && (
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-cyan-400 text-2xl">folder</span>
              <span>Project Information & Timeline</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Enter project scope, target domain, and schedule dates.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Project Name *
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
                placeholder="e.g. Nexus Core Platform V2"
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Project Domain / Type
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
                placeholder="e.g. Full-Stack Web Application, Mobile App, AI Agent"
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
              />
            </div>

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
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Expected Completion Date
              </label>
              <input
                type="date"
                value={formData.project.expectedCompletionDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    project: { ...prev.project, expectedCompletionDate: e.target.value },
                  }))
                }
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
              Project Description & Architectural Scope
            </label>
            <textarea
              rows={3}
              value={formData.project.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  project: { ...prev.project, description: e.target.value },
                }))
              }
              placeholder="Outline the project goals, core technical stack, and high-level requirements..."
              className="w-full bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl p-4 text-sm text-white focus:outline-none transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 3: CONTRIBUTOR DETAILS */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 3 && (
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-cyan-400 text-2xl">person</span>
              <span>Developer / Contributor Information</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Enter contributor legal identity, contact info, and role.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Full Legal Name *
              </label>
              <input
                type="text"
                required
                value={formData.developer.fullName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    developer: { ...prev.developer, fullName: e.target.value },
                  }))
                }
                placeholder="e.g. Johnathan Ray Carter"
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Professional / Display Name
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
                placeholder="e.g. John Carter"
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
                placeholder="e.g. Full-Stack Software Engineer / UI Architect"
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
                placeholder="e.g. john@example.com"
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

            <div className="space-y-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                National ID / Passport / Tax Number
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
                placeholder="e.g. NID / Passport / Tax ID"
                className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors font-mono"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
              Residential / Physical Address
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
              placeholder="e.g. House 14, Road 5, Dhanmondi, Dhaka, Bangladesh"
              className="w-full h-11 bg-black/40 border border-white/[0.08] focus:border-cyan-400 rounded-xl px-4 text-sm text-white focus:outline-none transition-colors"
            />
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 4: COMPENSATION CONFIGURATION */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 4 && (
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="border-b border-white/[0.08] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
                <span className="material-symbols-outlined text-cyan-400 text-2xl">payments</span>
                <span>Compensation: {AGREEMENT_TYPE_LABELS[formData.agreementType]}</span>
              </h2>
              <p className="text-xs text-gray-400 font-mono mt-1">
                Define payment terms, rates, and distribution schedule.
              </p>
            </div>
            {/* Currency switcher */}
            <div className="flex items-center gap-2 bg-black/40 border border-white/[0.08] rounded-xl p-1 self-start sm:self-auto font-mono text-xs">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    compensation: { ...prev.compensation, currency: "BDT" },
                  }))
                }
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  formData.compensation.currency === "BDT" ? "bg-cyan-500 text-black font-bold" : "text-gray-400"
                }`}
              >
                BDT (৳)
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    compensation: { ...prev.compensation, currency: "USD" },
                  }))
                }
                className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                  formData.compensation.currency === "USD" ? "bg-cyan-500 text-black font-bold" : "text-gray-400"
                }`}
              >
                USD ($)
              </button>
            </div>
          </div>

          {/* PROFIT PARTICIPATION FIELDS */}
          {(formData.agreementType === "profit_participation" || formData.agreementType === "hybrid") && (
            <div className="space-y-6">
              {/* Important Legal Notice Banner */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">shield</span>
                  <span>Legal Distinction: Project Profit Participation ≠ Corporate Equity</span>
                </p>
                <p className="text-gray-300 leading-relaxed">
                  This model grants a contractual participation in the specified Project's Net Distributable Profit. It does NOT convey shares, equity, voting rights, or corporate ownership in DevEngine.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                      Participation Share *
                    </label>
                    <span className="text-cyan-400 font-mono font-bold text-base">
                      {formData.compensation.profitTerms?.participationPercentage || 10}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={formData.compensation.profitTerms?.participationPercentage || 10}
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
                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-gray-500">
                    <span>5% (Advisory)</span>
                    <span>10% (Standard)</span>
                    <span>25% (Co-Lead)</span>
                    <span>50% (Equal)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Profit Basis
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
                    Distribution Frequency
                  </label>
                  <div className="relative">
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
                      aria-label="Distribution frequency"
                      className="w-full h-11 bg-[#090d16] border border-white/[0.1] focus:border-cyan-400 rounded-xl px-4 pr-10 text-xs text-white focus:outline-none transition-colors font-mono cursor-pointer appearance-none"
                    >
                      <option value="Monthly within 10 days of calendar month-end">Monthly</option>
                      <option value="Quarterly within 15 days following calendar quarter-end">Quarterly (Standard)</option>
                      <option value="Bi-annually within 30 days of half-year close">Bi-annually</option>
                      <option value="Annually upon audited fiscal reconciliation">Annually</option>
                    </select>
                    <span className="material-symbols-outlined text-gray-400 text-sm absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Deductible Project Expenses Checklist */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                  Deductible Project Expenses Checklist (Used to compute Net Distributable Profit)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DEFAULT_PROFIT_EXPENSES.map((expense) => {
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
              </div>
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

          {/* FIXED / HYBRID COMPLETION FIELDS */}
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
                  placeholder="e.g. Bank Wire / BEFTN / bKash Commercial"
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
                  Availability Hours / Week
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
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 5: SCOPE & DELIVERABLES BUILDER (+ MILESTONES) */}
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
                    Add unlimited phases. Total contract value automatically calculates in real-time.
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

          {/* DELIVERABLES BUILDER */}
          <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-cyan-400 text-2xl">checklist</span>
                  <span>Scope of Work & Formal Deliverables</span>
                </h2>
                <p className="text-xs text-gray-400 font-mono mt-1">
                  List deliverables, priority levels, and acceptance criteria.
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
                    <span className="font-mono text-xs text-white font-bold">
                      #{idx + 1}. {d.title || "Untitled Deliverable"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeliverable(idx)}
                      className="text-gray-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
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
                      <div className="relative">
                        <select
                          value={d.priority}
                          onChange={(e) => handleUpdateDeliverable(idx, "priority", e.target.value)}
                          aria-label="Priority level"
                          className="w-full h-10 bg-[#090d16] border border-white/[0.1] focus:border-cyan-400 rounded-xl px-3 pr-8 text-xs text-white focus:outline-none transition-colors font-mono cursor-pointer appearance-none"
                        >
                          <option value="Critical">Critical</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                        <span className="material-symbols-outlined text-gray-400 text-sm absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                          expand_more
                        </span>
                      </div>
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
                      <label className="text-[11px] font-mono text-gray-400 uppercase">Acceptance Criteria</label>
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
      {/* STEP 6: TERMS & LEGAL CLAUSES */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 6 && (
        <div className="bg-[#0c0c16]/95 border border-white/[0.08] rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="border-b border-white/[0.08] pb-4">
            <h2 className="text-xl font-bold font-['Space_Grotesk'] text-white flex items-center gap-2.5">
              <span className="material-symbols-outlined text-cyan-400 text-2xl">gavel</span>
              <span>Agreement Terms & Legal Parameters</span>
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Set warranty period, review window, and notice duration.
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

            <div className="space-y-2 md:col-span-2">
              <label className="block text-xs font-mono text-gray-400 uppercase tracking-wider">
                Governing Law & Jurisdiction
              </label>
              <input
                type="text"
                value={`${formData.terms.governingLaw} | ${formData.terms.jurisdiction}`}
                disabled
                className="w-full h-11 bg-black/20 border border-white/[0.05] rounded-xl px-4 text-sm text-gray-400 font-mono cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STEP 7: FINAL REVIEW */}
      {/* ------------------------------------------------------------------ */}
      {currentStep === 7 && (
        <div className="space-y-6">
          {/* Pre-flight validation warnings */}
          {!validation.valid && (
            <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm">
                <span className="material-symbols-outlined text-base">warning</span>
                <span>Pre-Flight Validation Incomplete</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                {validation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Review Summary Bento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] space-y-3">
              <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                Agreement Scope
              </span>
              <p className="text-xl font-bold font-['Space_Grotesk'] text-white">
                {formData.project.projectName || "Untitled Project"}
              </p>
              <div className="text-xs font-mono text-gray-400 space-y-1">
                <p>Type: {formData.agreementTypeLabel}</p>
                <p>Effective: {formData.project.agreementEffectiveDate}</p>
                <p>Deliverables: {formData.deliverables.length} Defined</p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] space-y-3">
              <span className="text-[11px] font-mono text-amber-400 uppercase tracking-wider font-semibold">
                Contributor Info
              </span>
              <p className="text-xl font-bold font-['Space_Grotesk'] text-white">
                {formData.developer.fullName || "Unset"}
              </p>
              <div className="text-xs font-mono text-gray-400 space-y-1">
                <p>Role: {formData.developer.role}</p>
                <p>Email: {formData.developer.email}</p>
                <p>Phone: {formData.developer.phone || "Unset"}</p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#0c0c16]/95 border border-white/[0.08] space-y-3">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                Financial Model
              </span>
              <p className="text-xl font-bold font-['Space_Grotesk'] text-white">
                {formData.agreementType === "profit_participation"
                  ? `${formData.compensation.profitTerms?.participationPercentage}% Profit Share`
                  : formData.agreementType === "hourly"
                  ? `${formData.compensation.currency} ${formData.compensation.hourlyRate}/hr`
                  : `${formData.compensation.currency} ${Number(formData.compensation.totalContractValue || formData.compensation.fixedAmount || 0).toLocaleString()}`}
              </p>
              <div className="text-xs font-mono text-gray-400 space-y-1">
                <p>Currency: {formData.compensation.currency}</p>
                <p>Frequency: {formData.compensation.paymentFrequency || "On Acceptance"}</p>
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
        {/* Left: Step navigation / disclaimer */}
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

        {/* Right: Save Draft, Preview, Finalize */}
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
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs font-semibold tracking-wider transition-all border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            <span>Preview Document</span>
          </button>

          {formData.status !== "finalized" && (
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
        Agreement templates are provided for DevEngine's operational use and should be reviewed by qualified legal counsel before being used as a legally binding instrument where required.
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
