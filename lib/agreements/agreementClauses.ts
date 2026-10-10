import { AgreementRecord } from "@/types/agreement";
import { CLAUSE_DEFINITIONS, AgreementClauseSection } from "@/lib/agreements/clauseRegistry";

export type { AgreementClauseSection };

/**
 * Builds all modular, tailored, and verified legal clauses for an agreement.
 * Uses the Centralized Clause Registry, applying conditional rules, model matching,
 * and appending custom configured clauses.
 */
export function buildAgreementClauses(record: AgreementRecord): AgreementClauseSection[] {
  const sections: AgreementClauseSection[] = [];
  let currentClauseNum = 1;

  for (const def of CLAUSE_DEFINITIONS) {
    // Check if applicable to current agreement model
    if (!def.applicableModels.includes(record.agreementType)) {
      continue;
    }

    const section = def.generate(record);
    if (section) {
      // Re-number sequentially to guarantee pristine numbering
      sections.push({
        ...section,
        number: String(currentClauseNum++),
      });
    }
  }

  // Append any custom clauses defined by the administrator
  if (record.customClauses && record.customClauses.length > 0) {
    for (const custom of record.customClauses) {
      if (!custom.title?.trim() && !custom.content?.trim()) continue;
      sections.push({
        id: custom.id || `custom_${currentClauseNum}`,
        number: String(currentClauseNum++),
        title: custom.title.toUpperCase(),
        paragraphs: custom.content.split("\n\n").filter(Boolean),
      });
    }
  }

  return sections;
}
