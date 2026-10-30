import { collection, doc, getDoc, getDocFromServer, getDocs, runTransaction, deleteField } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { getPdfBrandingSettings } from "@/lib/services/pdfSettingsService";
export type CostPeriod = "one_time" | "monthly" | "yearly";
export interface BriefCost { id: string; title: string; quantity: number; amount: number; period: CostPeriod; }
export interface ProjectBrief {
  id: string; title: string; client: string; clientEmail: string; clientPhone?: string; overview: string; objectives: string; technology: string;
  deliveryPlan: string; timeline: string; deliverables: string; assumptions: string; paymentTerms: string;
  additionalNote?: string;
  currency: string; shareToken?: string; status: "draft" | "ready"; costs: BriefCost[]; createdAt: string; updatedAt: string; createdBy: string;
  hasDiscount?: boolean; discountPercent?: number;
}
const COL = "admin_project_briefs";
const SHARES = "shared_project_briefs";
export type ProjectBriefDocument = Omit<ProjectBrief, "id" | "createdBy" | "shareToken">;
export interface ProjectBriefPublisher {
  companyName: string; companyEmail: string; companyWebsite: string; companyAddress: string; companyPhone: string;
  developerName: string; developerTitle: string; developerEmail: string; developerWebsite: string;
}
export interface SharedProjectBrief { brief: ProjectBriefDocument; publisher: ProjectBriefPublisher; enabled: boolean; updatedAt: string; }
export async function getProjectBriefPublisher(profile?: { name: string; title: string }) {
  const settings = await getPdfBrandingSettings();
  return {
    companyName: settings.companyLegalName || "DevEngine", companyEmail: settings.companyEmail,
    companyWebsite: settings.companyWebsiteUrl, companyAddress: settings.companyAddress || "", companyPhone: settings.contactPhone || "",
    developerName: profile?.name || settings.signatoryName || "DevEngine",
    developerTitle: profile?.title || settings.signatoryTitle || "Project developer",
    developerEmail: settings.founderEmail || settings.companyEmail, developerWebsite: settings.developerPortfolioUrl,
  } satisfies ProjectBriefPublisher;
}
function sharedDocument(brief: ProjectBrief): ProjectBriefDocument {
  // Publish only the proposal content, never owner IDs or internal access tokens.
  return {
    title: brief.title, client: brief.client, clientEmail: brief.clientEmail || "", clientPhone: brief.clientPhone || "", overview: brief.overview,
    objectives: brief.objectives, technology: brief.technology, deliveryPlan: brief.deliveryPlan, timeline: brief.timeline,
    deliverables: brief.deliverables, assumptions: brief.assumptions, paymentTerms: brief.paymentTerms,
    additionalNote: brief.additionalNote || "",
    currency: brief.currency, status: brief.status, costs: brief.costs, createdAt: brief.createdAt, updatedAt: brief.updatedAt,
    hasDiscount: Boolean(brief.hasDiscount), discountPercent: brief.discountPercent || 0,
  };
}

export function briefTotals(brief: Pick<ProjectBrief, "costs"> & { hasDiscount?: boolean; discountPercent?: number }) {
  const total = (period: CostPeriod) => brief.costs.filter(item => item.period === period).reduce((sum, item) => sum + (Number.isFinite(item.quantity * item.amount) ? item.quantity * item.amount : 0), 0);
  const oneTime = total("one_time"), monthly = total("monthly"), yearly = total("yearly");
  const subtotal = oneTime + monthly * 12 + yearly;
  const isDiscountActive = Boolean(brief.hasDiscount && brief.discountPercent && brief.discountPercent > 0);
  const discountPercent = isDiscountActive ? Math.min(100, Math.max(1, Math.round(brief.discountPercent || 0))) : 0;
  const discountAmount = isDiscountActive ? (subtotal * discountPercent) / 100 : 0;
  const firstYear = Math.max(0, subtotal - discountAmount);
  return {
    oneTime,
    monthly,
    yearly,
    subtotal,
    hasDiscount: isDiscountActive,
    discountPercent,
    discountAmount,
    firstYear,
  };
}
export function briefMoney(value: number, currency: string) {
  try { return new Intl.NumberFormat("en", { style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: 2 }).format(value); }
  catch { return `${currency} ${value.toFixed(2)}`; }
}
export function blankBrief(): ProjectBrief {
  const date = new Date().toISOString();
  return { id: "", title: "", client: "", clientEmail: "", clientPhone: "", overview: "", objectives: "", technology: "", deliveryPlan: "", timeline: "", deliverables: "", assumptions: "", paymentTerms: "", additionalNote: "", currency: "BDT", status: "draft", hasDiscount: false, discountPercent: 10, costs: ["Discovery & planning", "UI / UX design", "Development", "Server & infrastructure", "Deployment"].map((title, index) => ({ id: crypto.randomUUID(), title, quantity: 1, amount: 0, period: index === 3 ? "monthly" : "one_time" })), createdAt: date, updatedAt: date, createdBy: "" };
}
function requireAdmin() {
  const user = auth.currentUser;
  if (!user || user.email !== (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "hamim.leon@gmail.com")) throw new Error("Administrator access is required.");
  return user;
}
export async function getProjectBriefs() {
  requireAdmin();
  const docs = await getDocs(collection(db, COL));
  return docs.docs.map(item => ({ ...item.data(), id: item.id } as ProjectBrief)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
export async function saveProjectBrief(input: ProjectBrief): Promise<ProjectBrief> {
  const user = requireAdmin();
  if (!input.title.trim() || !input.client.trim()) throw new Error("Enter a project title and client name.");
  const clientEmail = (input.clientEmail || "").trim(), clientPhone = (input.clientPhone || "").trim();
  if (clientEmail && !/^n\/a$/i.test(clientEmail) && !/^[^\s@]+@[^\s@]+$/.test(clientEmail)) throw new Error("Enter a client email, N/A, or leave it blank.");
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error("Choose a valid currency.");
  if (input.costs.length > 60) throw new Error("Use up to 60 budget items.");
  const costs = input.costs.map(item => {
    if (!item.title.trim()) throw new Error("Name every budget item.");
    if (!Number.isFinite(item.amount) || item.amount < 0 || !Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("Costs must be positive or zero, and quantities must be greater than zero.");
    if (!["one_time", "monthly", "yearly"].includes(item.period)) throw new Error("Choose a billing period.");
    return { id: item.id, title: item.title.trim(), quantity: item.quantity, amount: item.amount, period: item.period };
  });
  const ref = input.id ? doc(db, COL, input.id) : doc(collection(db, COL));
  const now = new Date().toISOString();
  const publisher = await getProjectBriefPublisherFromAccount();
  return runTransaction(db, async transaction => {
    const existing = await transaction.get(ref);
    const { shareToken: ignoredInputToken, ...fields } = input;
    const token = existing.data()?.shareToken as string | undefined;
    const hasDiscount = Boolean(input.hasDiscount);
    const discountPercent = hasDiscount ? Math.min(100, Math.max(1, Math.round(Number(input.discountPercent) || 0))) : 0;
    const result: ProjectBrief = { ...fields, id: ref.id, title: input.title.trim(), client: input.client.trim(), clientEmail, clientPhone, costs,
      additionalNote: (input.additionalNote || "").trim(),
      hasDiscount, discountPercent,
      createdAt: existing.data()?.createdAt || now, updatedAt: now, createdBy: user.uid, ...(token ? { shareToken: token } : {}) };
    transaction.set(ref, result);
    if (token) transaction.set(doc(db, SHARES, token), { brief: sharedDocument(result), publisher, enabled: true, updatedAt: now });
    return result;
  });
}

async function getProjectBriefPublisherFromAccount() {
  const profile = await getDoc(doc(db, "app_settings", "admin_profile"));
  return getProjectBriefPublisher(profile.exists() ? { name: profile.data().name, title: profile.data().title } : undefined);
}
export async function publishProjectBrief(id: string): Promise<ProjectBrief> {
  requireAdmin();
  const privateRef = doc(db, COL, id);
  const candidateToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), value => value.toString(16).padStart(2, "0")).join("");
  const publisher = await getProjectBriefPublisherFromAccount();
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(privateRef);
    if (!snapshot.exists()) throw new Error("Save this project brief before sharing.");
    const brief = { ...snapshot.data(), id } as ProjectBrief;
    const token = brief.shareToken || candidateToken;
    transaction.update(privateRef, { shareToken: token });
    transaction.set(doc(db, SHARES, token), { brief: sharedDocument(brief), publisher, enabled: true, updatedAt: new Date().toISOString() });
    return { ...brief, shareToken: token };
  });
}
export async function revokeProjectBriefShare(id: string): Promise<void> {
  requireAdmin();
  const ref = doc(db, COL, id);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error("Project brief not found.");
    const token = snapshot.data().shareToken;
    if (token) transaction.delete(doc(db, SHARES, token));
    transaction.update(ref, { shareToken: deleteField() });
  });
}
export async function getSharedProjectBrief(token: string): Promise<SharedProjectBrief | null> {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const snapshot = await getDocFromServer(doc(db, SHARES, token));
  return snapshot.exists() && snapshot.data().enabled ? snapshot.data() as SharedProjectBrief : null;
}
export async function deleteProjectBrief(id: string) {
  requireAdmin();
  const ref = doc(db, COL, id);
  await runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    const token = snapshot.data()?.shareToken;
    transaction.delete(ref);
    if (token) transaction.delete(doc(db, SHARES, token));
  });
}
