import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TeamMember, FounderProfile } from "@/types/team";

const TEAM_COLLECTION = "team_members";
const ABOUT_COLLECTION = "studio_about";
const FOUNDER_DOC_ID = "founder";

export const DEFAULT_FOUNDER: FounderProfile = {
  id: "founder",
  name: "MD. ABDUL HAMIM LEON",
  title: "Founder & Chief Architect, DevEngine",
  headline: "Engineering Real-World Solutions.",
  bio: "Software Developer and Systems Architect from Bangladesh 🇧🇩, focused on building scalable, performance-focused mobile and web applications. B.Sc. in CSE at Daffodil International University, Ostad Flutter Pro Graduate (96.5/100 score), and Lead Mobile Developer at NEONECY.",
  avatarUrl: "/assets/CEO.png",
  portfolioUrl: "https://thedevhamim.vercel.app/",
  location: "Banasree, Rampura, Dhaka 1219, Bangladesh",
  education: "B.Sc. in Computer Science & Engineering (DIU)",
  achievements: [
    "Founder of DevEngine Systems Inc. & Lead Architect",
    "Lead Mobile Developer at NEONECY (neonecy.com)",
    "Ostad Pro Batch Flutter Graduate (96.5/100 Score)",
    "Built production mobile & cloud applications serving thousands of live users",
  ],
  techBadges: ["Android", "iOS", "Full Stack"],
};

export const INITIAL_TEAM: TeamMember[] = [
  {
    id: "arina-huque-rafa",
    name: "Arina Huque Rafa",
    role: "Shopify Developer",
    bio: "Specializing in high-performance Shopify Liquid architectures, custom e-commerce themes, conversion-rate optimization, and enterprise store scaling with bespoke integrations.",
    avatarUrl: "/assets/arina_huque_rafa.png",
    skills: ["Shopify Liquid", "E-Commerce", "JavaScript", "Custom Themes", "Tailwind CSS", "Store Architecture"],
    socialLinks: {
      email: "devenginesoftsolution@gmail.com",
    },
    order: 1,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "sabiha-jahan-mishu",
    name: "Sabiha Jahan Mishu",
    role: "AI & Backend Developer",
    bio: "Engineering resilient backend microservices, real-time API integrations, database architecture, and state-of-the-art AI automation pipelines for scalable digital platforms.",
    avatarUrl: "/assets/sabiha_jahan_mishu.png",
    skills: ["Python", "FastAPI", "AI Pipelines", "Django", "PostgreSQL", "REST APIs", "Vector Databases"],
    socialLinks: {
      email: "devenginesoftsolution@gmail.com",
    },
    order: 2,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "dhrubo-mandal",
    name: "Dhrubo Mandal",
    role: "Full Stack Developer",
    bio: "Crafting responsive modern web platforms, full-stack microservices, cloud infrastructure workflows, and intuitive reactive interface experiences with Next.js and TypeScript.",
    avatarUrl: "/assets/dhrubo_mandal.png",
    skills: ["Next.js", "React", "Node.js", "TypeScript", "Tailwind CSS", "REST & GraphQL", "MongoDB"],
    socialLinks: {
      email: "devenginesoftsolution@gmail.com",
    },
    order: 3,
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

/**
 * Seed initial core team members to Firestore
 */
export async function seedInitialTeam(): Promise<number> {
  let count = 0;
  for (const member of INITIAL_TEAM) {
    const docRef = doc(db, TEAM_COLLECTION, member.id);
    await setDoc(docRef, member, { merge: true });
    count++;
  }
  return count;
}

/**
 * Seed Founder & CEO Profile to Firestore
 */
export async function seedFounderProfile(): Promise<void> {
  const docRef = doc(db, ABOUT_COLLECTION, FOUNDER_DOC_ID);
  await setDoc(
    docRef,
    {
      ...DEFAULT_FOUNDER,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Fetch Founder & CEO Profile
 */
export async function getFounderProfile(): Promise<FounderProfile> {
  try {
    const docRef = doc(db, ABOUT_COLLECTION, FOUNDER_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_FOUNDER, ...(snap.data() as any) };
    }
    return DEFAULT_FOUNDER;
  } catch (err) {
    console.warn("Could not fetch founder profile from Firestore, using default:", err);
    return DEFAULT_FOUNDER;
  }
}

/**
 * Update Founder & CEO Profile
 */
export async function updateFounderProfile(
  data: Partial<FounderProfile>
): Promise<void> {
  const docRef = doc(db, ABOUT_COLLECTION, FOUNDER_DOC_ID);
  await setDoc(
    docRef,
    {
      ...data,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Fetch active team members for public About page
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    const snap = await getDocs(collection(db, TEAM_COLLECTION));
    if (snap.empty) {
      return INITIAL_TEAM;
    }

    const list: TeamMember[] = snap.docs
      .map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }))
      .filter((m) => m.isActive !== false);

    // Sort by order
    list.sort((a, b) => (a.order || 99) - (b.order || 99));
    return list.length > 0 ? list : INITIAL_TEAM;
  } catch (err) {
    console.warn("Could not fetch team members from Firestore, using fallback:", err);
    return INITIAL_TEAM;
  }
}

/**
 * Fetch all team members for Admin panel
 */
export async function getAllTeamMembersAdmin(): Promise<TeamMember[]> {
  try {
    const snap = await getDocs(collection(db, TEAM_COLLECTION));
    if (snap.empty) {
      return INITIAL_TEAM;
    }

    const list: TeamMember[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    list.sort((a, b) => (a.order || 99) - (b.order || 99));
    return list;
  } catch (err) {
    console.error("Error fetching admin team members:", err);
    return INITIAL_TEAM;
  }
}

/**
 * Create new Team Member
 */
export async function createTeamMember(
  data: Omit<TeamMember, "id" | "createdAt">
): Promise<string> {
  const docRef = doc(collection(db, TEAM_COLLECTION));
  const newMember: TeamMember = {
    ...data,
    id: docRef.id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, newMember);
  return docRef.id;
}

/**
 * Update Team Member
 */
export async function updateTeamMember(
  id: string,
  data: Partial<TeamMember>
): Promise<void> {
  const docRef = doc(db, TEAM_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Delete Team Member
 */
export async function deleteTeamMember(id: string): Promise<void> {
  const docRef = doc(db, TEAM_COLLECTION, id);
  await deleteDoc(docRef);
}
