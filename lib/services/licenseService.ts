import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LicenseConfig } from "@/types/license";

const COLLECTION_NAME = "license_config";
const MAIN_DOC_ID = "main";

export const DEFAULT_LICENSE_CONFIG: LicenseConfig = {
  header: {
    badgeText: "COMMERCIAL SOFTWARE TERMS",
    title: "Commercial License Agreement",
    subtitle:
      "Legally binding commercial software license terms governing production deployment, source code rights, and client deliverables engineered by DevEngine.",
    lastUpdated: "September 2026",
    statusText: "LICENSE ACTIVE",
    version: "v2.4-ENTERPRISE",
  },
  grantOfLicense: {
    id: "grant-of-license",
    number: "01",
    title: "Grant of Commercial License",
    paragraphs: [
      'Upon full receipt of the agreed licensing fee, DevEngine ("Licensor") grants to the purchasing individual or legal entity ("Licensee") a non-exclusive, perpetual, worldwide, irrevocable license to install, execute, deploy, customize, and operate the acquired software architecture, source repositories, or templates.',
      "This license is granted strictly in accordance with the purchased tier specifications (Starter, Professional, or Enterprise) as indicated on the verified order invoice.",
    ],
    bullets: [
      "Perpetual rights to run the codebase in production across designated client or internal domains.",
      "Right to create derivative works, build proprietary modules, and compile deployment builds.",
      "Royalty-free commercial redistribution of the integrated end-product to end-users.",
    ],
  },
  permittedUses: {
    id: "permitted-uses",
    number: "02",
    title: "Permitted Uses & Commercial Scope",
    paragraphs: [
      "The Licensee is authorized to modify, expand, integrate, and deploy the licensed code into unlimited client solutions, customer-facing web applications, mobile builds, or SaaS offerings under the following scopes:",
    ],
    bullets: [
      "Private and commercial SaaS platforms operated directly by Licensee or Licensee clients.",
      "White-label client deliverable deployments with custom brand identities.",
      "Internal tooling, workflow orchestration systems, and automated microservices.",
      "Modification of styling, data layers, backend endpoints, and cloud infrastructure logic.",
    ],
  },
  restrictions: {
    id: "restrictions",
    number: "03",
    title: "Prohibitions & Anti-Redistribution Clause",
    paragraphs: [
      "To protect DevEngine proprietary architecture and all commercial licensees, the following activities are strictly prohibited and constitute a material breach of this agreement:",
    ],
    bullets: [
      "Direct resale, sub-licensing, renting, leasing, or public open-sourcing of the raw source code repository.",
      "Uploading or publishing unmodified source files to public GitHub/GitLab repositories or code-sharing boards.",
      "Packaging the codebase into a competing commercial code template, theme marketplace asset, or boilerplate kit.",
      "Circumventing license key validation, proof-of-purchase audit, or tampering with copyright headers on core framework libraries.",
    ],
  },
  sourceCodeRights: {
    id: "source-code-rights",
    number: "04",
    title: "Source Code Access & Version Updates",
    paragraphs: [
      "Full source code access is granted via invite to private GitHub repositories or direct cryptographically signed zip archives once payment verification is confirmed.",
      "Licensee receives architectural patches, dependency fixes, and security patches released for the purchased major version as outlined in the tier deliverables.",
    ],
    bullets: [
      "Git branch access with commit history and environment configuration documentation.",
      "CI/CD pipeline templates and Docker containerization manifests included.",
      "Access to community architecture advisories and engineering issue boards.",
    ],
  },
  intellectualProperty: {
    id: "intellectual-property",
    number: "05",
    title: "Intellectual Property Ownership",
    paragraphs: [
      "DevEngine retains all title, copyright, and intellectual property rights in and to the original core frameworks, foundational architectures, and standard scaffolding modules.",
      "The Licensee exclusively owns all custom branding, proprietary database schemas, specific business logic, and custom third-party integrations developed atop the DevEngine framework.",
    ],
  },
  warrantiesAndLiability: {
    id: "warranties-and-liability",
    number: "06",
    title: "Warranty Disclaimer & Limitation of Liability",
    paragraphs: [
      'The software is provided "AS IS", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement.',
      "In no event shall DevEngine or its engineers be liable for any claim, damages, or other liability arising from out-of-scope modifications, third-party API service outages, or unauthorized server infrastructure misconfigurations.",
    ],
  },
  termination: {
    id: "termination",
    number: "07",
    title: "Termination & Breach Protocol",
    paragraphs: [
      "This agreement is effective until terminated. DevEngine reserves the right to terminate this license immediately if Licensee breaches any material provision of this agreement, including unlawful redistribution of raw source assets.",
      "Upon termination for material breach, Licensee must delete all copies of raw repository assets from private storage and cease further distribution of new instances.",
    ],
  },
  auditAndCompliance: {
    id: "audit-and-compliance",
    number: "08",
    title: "Verification & Audit Rights",
    paragraphs: [
      "DevEngine maintains a verifiable cryptographic order ledger for each commercial purchase. Upon request, Licensee agrees to provide their Order ID or invoice proof to confirm active commercial deployment eligibility during enterprise audits.",
    ],
  },
};

export async function getLicenseConfig(): Promise<LicenseConfig> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      return DEFAULT_LICENSE_CONFIG;
    }

    let foundData: any = null;
    snapshot.forEach((docSnap) => {
      if (docSnap.id === MAIN_DOC_ID) {
        foundData = docSnap.data();
      }
    });

    if (!foundData) {
      return DEFAULT_LICENSE_CONFIG;
    }

    return {
      header: { ...DEFAULT_LICENSE_CONFIG.header, ...(foundData.header || {}) },
      grantOfLicense: {
        ...DEFAULT_LICENSE_CONFIG.grantOfLicense,
        ...(foundData.grantOfLicense || {}),
      },
      permittedUses: {
        ...DEFAULT_LICENSE_CONFIG.permittedUses,
        ...(foundData.permittedUses || {}),
      },
      restrictions: {
        ...DEFAULT_LICENSE_CONFIG.restrictions,
        ...(foundData.restrictions || {}),
      },
      sourceCodeRights: {
        ...DEFAULT_LICENSE_CONFIG.sourceCodeRights,
        ...(foundData.sourceCodeRights || {}),
      },
      intellectualProperty: {
        ...DEFAULT_LICENSE_CONFIG.intellectualProperty,
        ...(foundData.intellectualProperty || {}),
      },
      warrantiesAndLiability: {
        ...DEFAULT_LICENSE_CONFIG.warrantiesAndLiability,
        ...(foundData.warrantiesAndLiability || {}),
      },
      termination: {
        ...DEFAULT_LICENSE_CONFIG.termination,
        ...(foundData.termination || {}),
      },
      auditAndCompliance: {
        ...DEFAULT_LICENSE_CONFIG.auditAndCompliance,
        ...(foundData.auditAndCompliance || {}),
      },
    };
  } catch (err) {
    console.warn("Notice: Firestore license_config fallback active:", err);
    return DEFAULT_LICENSE_CONFIG;
  }
}

export async function updateLicenseConfig(
  data: Partial<LicenseConfig>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
  await setDoc(
    docRef,
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function seedDefaultLicenseConfig(): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
  await setDoc(docRef, {
    ...DEFAULT_LICENSE_CONFIG,
    updatedAt: serverTimestamp(),
  });
}
