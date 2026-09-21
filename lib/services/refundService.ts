import {
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { RefundConfig } from "@/types/refund";

const COLLECTION_NAME = "refund_config";
const MAIN_DOC_ID = "main";

export const DEFAULT_REFUND_CONFIG: RefundConfig = {
  header: {
    badgeText: "FINANCIAL COMPLIANCE & PROTOCOL",
    title: "Strict No-Return & Refund Policy",
    subtitle:
      "Clear, upfront guidelines regarding manual transactions, digital architectural assets, license keys, and source code deliverables.",
    lastUpdated: "September 2026",
    policyStatus: "STRICT BINDING POLICY",
    strictBadge: "DIGITAL ASSETS NON-REFUNDABLE",
  },
  corePolicy: {
    id: "core-policy",
    number: "01",
    title: "Universal Strict No-Refund Rule",
    paragraphs: [
      "Due to the irrevocable, proprietary nature of software source code, architecture repositories, and downloadable digital license keys, ALL TRANSACTIONS AND PURCHASES ON DEVENGINE ARE FINAL, STRICTLY NON-RETURNABLE, AND NON-REFUNDABLE.",
      "Once payment verification is submitted and confirmed, digital assets, repository invites, or download credentials are automatically or manually provisioned. From this moment onward, goods cannot be returned or revoked.",
    ],
    bullets: [
      "No refunds are issued for buyer remorse, change of technical stack, or project postponement.",
      "No refunds are issued after GitHub organization invites or repository access grants are completed.",
      "No refunds are issued for inability to run local code due to client machine misconfigurations or incompatible third-party dependencies not specified in project requirements.",
    ],
  },
  digitalGoodsRationale: {
    id: "digital-goods-rationale",
    number: "02",
    title: "Rationale for Non-Returnable Digital Architecture",
    paragraphs: [
      "Unlike physical retail goods, source code, architectural schematics, Docker environments, and database migrations are intellectual assets that cannot be returned in a verifiable manner once inspected, cloned, or downloaded.",
      "To prevent unauthorized IP piracy, unlicensed duplication, and intellectual property theft, DevEngine maintains this strict policy across all software licenses and pre-engineered modules.",
    ],
    bullets: [
      "Full transparency: Detailed previews, live demos, and documentation are provided prior to purchase.",
      "Direct technical consultation is available on WhatsApp and email prior to completing checkout.",
    ],
  },
  verificationAudit: {
    id: "verification-audit",
    number: "03",
    title: "Manual Transfer Verification & Audit Guidelines",
    paragraphs: [
      "Our checkout utilizes direct manual transfers (bKash, Nagad, Rocket, DBBL, BRAC Bank). When submitting payment proof, you must enter the exact Transaction ID (TrxID) and sender account number.",
      "Transactions undergo an automated ledger check and administrative audit. Submitting fraudulent, manipulated, or fabricated Transaction IDs will result in immediate permanent blacklisting and cancellation without license issuance.",
    ],
  },
  disputeResolution: {
    id: "dispute-resolution",
    number: "04",
    title: "Duplicate Payments & Overpayment Protocol",
    paragraphs: [
      "If a customer accidentally sends duplicate payments or transfers an amount in excess of the listed tier fee due to a verifiable bank or mobile wallet error, our team will audit the statement ledger.",
      "In the verified event of an accidental duplicate transaction, DevEngine will issue an administrative store credit or coordinate an excess balance reconciliation minus bank/carrier processing fees.",
    ],
    bullets: [
      "Dispute claims must be filed within 48 hours of transaction initiation.",
      "Official banking SMS or mobile wallet transaction screenshot must be provided.",
      "Processing and carrier network deduction fees (1.5% - 2%) are non-reimbursable.",
    ],
  },
  exceptionsNotice: {
    id: "exceptions-notice",
    number: "05",
    title: "Exceptional Service Delivery Failures",
    paragraphs: [
      "If DevEngine fails to deliver access to the contracted repository within 7 business days following confirmed payment verification due to Licensor infrastructure failure, Licensee is entitled to a formal review and potential credit or mutual resolution.",
    ],
  },
  contactSupport: {
    id: "contact-support",
    number: "06",
    title: "Support & Pre-Purchase Inquiries",
    paragraphs: [
      "We strongly encourage all prospective licensees and engineering teams to ask questions, request demo walkthroughs, and confirm software compatibility before initiating checkout.",
      "Our engineering team is directly reachable via WhatsApp (+880 1724-879284) and email (support@devengine.com / hamim.leon@gmail.com).",
    ],
  },
};

export async function getRefundConfig(): Promise<RefundConfig> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      return DEFAULT_REFUND_CONFIG;
    }

    let foundData: any = null;
    snapshot.forEach((docSnap) => {
      if (docSnap.id === MAIN_DOC_ID) {
        foundData = docSnap.data();
      }
    });

    if (!foundData) {
      return DEFAULT_REFUND_CONFIG;
    }

    return {
      header: { ...DEFAULT_REFUND_CONFIG.header, ...(foundData.header || {}) },
      corePolicy: {
        ...DEFAULT_REFUND_CONFIG.corePolicy,
        ...(foundData.corePolicy || {}),
      },
      digitalGoodsRationale: {
        ...DEFAULT_REFUND_CONFIG.digitalGoodsRationale,
        ...(foundData.digitalGoodsRationale || {}),
      },
      verificationAudit: {
        ...DEFAULT_REFUND_CONFIG.verificationAudit,
        ...(foundData.verificationAudit || {}),
      },
      disputeResolution: {
        ...DEFAULT_REFUND_CONFIG.disputeResolution,
        ...(foundData.disputeResolution || {}),
      },
      exceptionsNotice: {
        ...DEFAULT_REFUND_CONFIG.exceptionsNotice,
        ...(foundData.exceptionsNotice || {}),
      },
      contactSupport: {
        ...DEFAULT_REFUND_CONFIG.contactSupport,
        ...(foundData.contactSupport || {}),
      },
    };
  } catch (err) {
    console.warn("Notice: Firestore refund_config fallback active:", err);
    return DEFAULT_REFUND_CONFIG;
  }
}

export async function updateRefundConfig(
  data: Partial<RefundConfig>
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

export async function seedDefaultRefundConfig(): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, MAIN_DOC_ID);
  await setDoc(docRef, {
    ...DEFAULT_REFUND_CONFIG,
    updatedAt: serverTimestamp(),
  });
}
