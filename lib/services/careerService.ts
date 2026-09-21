import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { JobCircular, JobApplication, ApplicationStatus } from "@/types/career";

const CIRCULARS_COLLECTION = "job_circulars";
const APPLICATIONS_COLLECTION = "job_applications";

export const INITIAL_SENIOR_UI_UX_CIRCULAR: JobCircular = {
  id: "senior-ui-ux-designer",
  title: "Senior UI/UX Designer",
  department: "Spatial Product Design & Systems",
  employmentType: "Full-time",
  location: "Remote / Worldwide (Dhaka Hub)",
  experienceLevel: "Senior (3+ Years)",
  salaryRange: "$1,200 – $2,200 / month (or competitive BDT equivalent)",
  overview:
    "We are seeking a visionary Senior UI/UX Designer to architect next-generation dark-mode digital engines, cinematic web applications, and mobile interfaces. You will establish design tokens, build interactive high-fidelity prototypes in Figma, and work closely with our Flutter, Next.js, and Systems engineering teams to deliver world-class aesthetic experiences.",
  responsibilities: [
    "Design cinematic, high-fidelity dark-mode user interfaces for mobile, web, and internal command center platforms.",
    "Build and govern scalable design systems, typography hierarchy, tokenized color palettes, and component libraries in Figma.",
    "Create interactive motion prototypes, micro-animations, and intuitive spatial interaction paradigms.",
    "Collaborate directly with the Founder, Mobile Architects, and Full-Stack Engineers to ensure pixel-perfect implementation.",
    "Conduct user flow audits, usability heuristics analysis, and client-facing spatial presentation decks.",
  ],
  requirements: [
    "3+ years of hands-on experience designing modern SaaS, mobile apps, or high-tech digital products.",
    "Exceptional portfolio demonstrating futuristic/modern dark-mode design, typography discipline, and sleek interaction craft.",
    "Mastery of Figma (Auto Layout, Component Variants, Variables, Tokens, and Interactive Components).",
    "Solid understanding of responsive layout constraints (mobile breakpoints, fluid web, desktop viewport ergonomics).",
    "Familiarity with frontend frameworks (HTML/CSS, Tailwind, Flutter concepts) to ensure design-to-code feasibility.",
    "Excellent communication skills and ability to articulate aesthetic and architectural decisions.",
  ],
  benefits: [
    "100% Remote flexibility with flexible autonomous working hours.",
    "Competitive compensation retainer with performance bonuses per production release.",
    "High-impact ownership — your designs directly power flagship production software.",
    "Subsidized hardware, design assets, and continuous learning allowances.",
    "Collaborative vanguard culture with zero bureaucratic friction.",
  ],
  skills: [
    "Figma",
    "Design Systems",
    "UI/UX Architecture",
    "Dark Mode Aesthetics",
    "Prototyping",
    "Micro-Animations",
    "Spatial Design",
  ],
  status: "open",
  deadline: "October 15, 2026",
  deadlineDate: "2026-10-15T23:59:59Z",
  order: 1,
  createdAt: new Date().toISOString(),
};

/**
 * Fetch all active/open job circulars for public career page
 */
export async function getActiveCirculars(): Promise<JobCircular[]> {
  try {
    const colRef = collection(db, CIRCULARS_COLLECTION);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      return [INITIAL_SENIOR_UI_UX_CIRCULAR];
    }

    const items: JobCircular[] = [];
    snap.forEach((d) => {
      const data = d.data() as JobCircular;
      if (data.status === "open") {
        items.push({ ...data, id: d.id });
      }
    });

    items.sort((a, b) => (a.order || 99) - (b.order || 99));

    return items.length > 0 ? items : [INITIAL_SENIOR_UI_UX_CIRCULAR];
  } catch (err) {
    console.error("Error fetching active circulars, using fallback:", err);
    return [INITIAL_SENIOR_UI_UX_CIRCULAR];
  }
}

/**
 * Fetch all job circulars (including closed/draft) for Admin CMS
 */
export async function getAllCircularsAdmin(): Promise<JobCircular[]> {
  try {
    const colRef = collection(db, CIRCULARS_COLLECTION);
    const snap = await getDocs(colRef);

    if (snap.empty) {
      return [INITIAL_SENIOR_UI_UX_CIRCULAR];
    }

    const items: JobCircular[] = [];
    snap.forEach((d) => {
      items.push({ ...(d.data() as JobCircular), id: d.id });
    });

    items.sort((a, b) => (a.order || 99) - (b.order || 99));
    return items;
  } catch (err) {
    console.error("Error fetching admin circulars:", err);
    return [INITIAL_SENIOR_UI_UX_CIRCULAR];
  }
}

/**
 * Seed Senior UI/UX Designer circular into Firestore
 */
export async function seedInitialCircular(): Promise<boolean> {
  try {
    const docRef = doc(db, CIRCULARS_COLLECTION, INITIAL_SENIOR_UI_UX_CIRCULAR.id);
    await setDoc(docRef, INITIAL_SENIOR_UI_UX_CIRCULAR, { merge: true });
    return true;
  } catch (err) {
    console.error("Error seeding initial circular:", err);
    throw err;
  }
}

/**
 * Create a new job circular
 */
export async function createCircular(
  data: Omit<JobCircular, "id" | "createdAt">
): Promise<string> {
  const colRef = collection(db, CIRCULARS_COLLECTION);
  const now = new Date().toISOString();
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

/**
 * Update an existing job circular
 */
export async function updateCircular(
  id: string,
  data: Partial<JobCircular>
): Promise<void> {
  const docRef = doc(db, CIRCULARS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete a job circular
 */
export async function deleteCircular(id: string): Promise<void> {
  const docRef = doc(db, CIRCULARS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Submit candidate application
 */
export async function submitJobApplication(
  data: Omit<JobApplication, "id" | "status" | "appliedAt">
): Promise<string> {
  const colRef = collection(db, APPLICATIONS_COLLECTION);
  const docRef = await addDoc(colRef, {
    ...data,
    status: "new",
    appliedAt: new Date().toISOString(),
  });
  return docRef.id;
}

/**
 * Fetch all candidate applications for Admin CMS
 */
export async function getApplicationsAdmin(): Promise<JobApplication[]> {
  try {
    const colRef = collection(db, APPLICATIONS_COLLECTION);
    const snap = await getDocs(colRef);

    const items: JobApplication[] = [];
    snap.forEach((d) => {
      items.push({ ...(d.data() as JobApplication), id: d.id });
    });

    items.sort(
      (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
    );
    return items;
  } catch (err) {
    console.error("Error fetching applications:", err);
    return [];
  }
}

/**
 * Update application review status or admin notes
 */
export async function updateApplicationStatus(
  id: string,
  status: ApplicationStatus,
  adminNotes?: string
): Promise<void> {
  const docRef = doc(db, APPLICATIONS_COLLECTION, id);
  const payload: any = {
    status,
    reviewedAt: new Date().toISOString(),
  };
  if (adminNotes !== undefined) {
    payload.adminNotes = adminNotes;
  }
  await updateDoc(docRef, payload);
}

/**
 * Delete an application
 */
export async function deleteApplication(id: string): Promise<void> {
  const docRef = doc(db, APPLICATIONS_COLLECTION, id);
  await deleteDoc(docRef);
}
