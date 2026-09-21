import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { DevEngineService, ServiceInquiry } from "@/types/service";

export const SERVICES_COLLECTION = "services";
export const INQUIRIES_COLLECTION = "service_inquiries";

export const DEFAULT_SERVICES: DevEngineService[] = [
  {
    id: "fullstack-web",
    slug: "fullstack-web-architecture",
    title: "Full-Stack Web Architecture",
    tagline: "High-throughput Next.js & TypeScript microservices built for limitless scale.",
    category: "Web Architecture",
    icon: "layers",
    badge: "ENTERPRISE GRADE",
    description:
      "We build resilient, ultra-fast web platforms using Next.js 15, React 19, and Node.js. From real-time state synchronization to headless API architectures, we craft systems that easily withstand viral traffic spikes.",
    deliverables: [
      "Custom Next.js & React Full-Stack Platform",
      "Type-safe REST & GraphQL Microservices",
      "Database Modeling & High-Performance Caching",
      "Full SEO & Performance Optimization (99+ Lighthouse)",
      "Automated CI/CD Pipeline & Zero-Downtime Deployment",
    ],
    techStack: ["Next.js 15", "React 19", "TypeScript", "Node.js", "PostgreSQL", "Redis", "TailwindCSS"],
    timeline: "2-4 Weeks Sprint",
    isPublic: true,
    order: 1,
    imageUrl: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "mobile-engineering",
    slug: "mobile-engineering",
    title: "Mobile App Engineering",
    tagline: "Cross-platform iOS & Android apps with silky 120 FPS native responsiveness.",
    category: "Mobile Engineering",
    icon: "smartphone",
    badge: "EXPEDITED SPRINT",
    description:
      "Engineered with Flutter and native modern toolkits, we ship mobile apps featuring offline-first data caching, real-time background sync, sleek glassmorphism animations, and turnkey Google Play & Apple App Store publishing.",
    deliverables: [
      "Cross-Platform iOS & Android Codebase (Flutter / Native)",
      "Offline-First Data Architecture & SQLite / Hive Sync",
      "Push Notifications & In-App Purchase Gateways",
      "Biometric Authentication & Security Encryption",
      "Complete Store Listing & TestFlight / Play Console Setup",
    ],
    techStack: ["Flutter", "Dart", "Firebase", "SQLite", "Riverpod", "Google Play API", "App Store Connect"],
    timeline: "3-5 Weeks Sprint",
    isPublic: true,
    order: 2,
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "ai-llm-engines",
    slug: "ai-llm-engines",
    title: "AI Integration & Custom LLM Engines",
    tagline: "Custom agentic workflows, RAG knowledge pipelines, and intelligent automation.",
    category: "AI & Machine Learning",
    icon: "psychology",
    badge: "HIGH IMPACT",
    description:
      "Transform static platforms into intelligent, context-aware engines. We integrate Gemini, OpenAI, Claude, vector databases, and semantic retrieval to construct intelligent conversational agents, dynamic analysis pipelines, and workflow automations.",
    deliverables: [
      "Custom Retrieval-Augmented Generation (RAG) Architecture",
      "Context-Retaining Conversational Assistant Integration",
      "Vector Database Setup (Pinecone / Chroma / pgvector)",
      "Automated Document Processing & Image Recognition",
      "API Token Consumption & Cost Optimization",
    ],
    techStack: ["Gemini 2.5", "OpenAI GPT-4o", "LangChain", "Pinecone", "Python", "FastAPI", "TensorFlow"],
    timeline: "2-3 Weeks Sprint",
    isPublic: true,
    order: 3,
    imageUrl: "https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "cloud-devops",
    slug: "cloud-devops-automation",
    title: "Cloud Infrastructure & DevOps",
    tagline: "Zero-defect CI/CD pipelines, container orchestration, and rock-solid 99.99% uptime.",
    category: "Cloud & DevOps",
    icon: "cloud_sync",
    badge: "99.99% SLA",
    description:
      "We design automated, secure cloud foundations on AWS, Google Cloud, and Firebase. Automated GitHub Actions pipelines, Docker containerization, Kubernetes autoscaling, and real-time telemetry give your team the confidence to deploy anytime.",
    deliverables: [
      "Containerized Docker & Orchestration Environment",
      "Continuous Integration & Continuous Deployment (CI/CD)",
      "Automated Database Backup & Disaster Recovery Protocols",
      "Cloud Security Hardening & Zero-Trust Access Rules",
      "Telemetry, Sentry Error Tracking & Latency Monitoring",
    ],
    techStack: ["Docker", "Kubernetes", "AWS", "Google Cloud", "GitHub Actions", "Terraform", "Nginx"],
    timeline: "1-2 Weeks Sprint",
    isPublic: true,
    order: 4,
    imageUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "uiux-design-systems",
    slug: "uiux-design-systems",
    title: "Interactive UI/UX & Design Systems",
    tagline: "Futuristic dark-mode cyber aesthetics, custom design tokens, and WebGL motion.",
    category: "Web Architecture",
    icon: "palette",
    badge: "AWWWARDS LEVEL",
    description:
      "We craft jaw-dropping user interfaces that captivate users immediately. Tailored typography, micro-interactions, responsive cyber cards, and reusable component libraries transform utility applications into unforgettable brand experiences.",
    deliverables: [
      "Comprehensive Design System & Design Token Library",
      "Futuristic Dark-Mode Interface Architecture",
      "Interactive Micro-Animations & Soundscape Effects",
      "Complete Mobile & Tablet Responsive Layouts",
      "Production-Ready TailwindCSS / CSS Component Library",
    ],
    techStack: ["Figma", "TailwindCSS", "Framer Motion", "WebGL", "Three.js", "Vanilla CSS"],
    timeline: "1-3 Weeks Sprint",
    isPublic: true,
    order: 5,
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "enterprise-systems",
    slug: "enterprise-systems-automation",
    title: "Enterprise Systems & Gateways",
    tagline: "Mission-critical billing, custom payment gateways, and automated internal tooling.",
    category: "Enterprise Systems",
    icon: "terminal",
    badge: "MISSION CRITICAL",
    description:
      "Robust custom systems engineered for secure enterprise operations. We integrate multi-currency billing engines, local payment gateways (bKash, Nagad, SSLCommerz, Stripe), automated ledger generation, and role-based audit logs.",
    deliverables: [
      "Multi-Currency Payment Processing (Stripe, bKash, Cards)",
      "Role-Based Access Control (RBAC) & Audit Trails",
      "Automated Invoice & Receipt Generation Engine",
      "Real-Time Analytics & Reporting Intelligence Dashboard",
      "Webhook Engine & High-Reliability Event Buses",
    ],
    techStack: ["Node.js", "Express", "Stripe API", "Firebase Admin", "PostgreSQL", "Redis", "OAuth 2.0"],
    timeline: "3-6 Weeks Sprint",
    isPublic: true,
    order: 6,
    imageUrl: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=800&auto=format&fit=crop",
  },
];

export async function getPublicServices(): Promise<DevEngineService[]> {
  try {
    const colRef = collection(db, SERVICES_COLLECTION);
    const q = query(colRef, where("isPublic", "==", true));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DevEngineService));
      return items.sort((a, b) => (a.order || 0) - (b.order || 0));
    }

    // Fallback: If collection empty, fetch without filter
    const allSnap = await getDocs(colRef);
    if (!allSnap.empty) {
      const items = allSnap.docs.map((d) => ({ id: d.id, ...d.data() } as DevEngineService));
      return items.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  } catch (err) {
    console.warn("Falling back to default pre-seeded services:", err);
  }

  return DEFAULT_SERVICES;
}

export async function getAllServices(): Promise<DevEngineService[]> {
  try {
    const colRef = collection(db, SERVICES_COLLECTION);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DevEngineService));
      return items.sort((a, b) => (a.order || 0) - (b.order || 0));
    }
  } catch (err) {
    console.error("Failed to get all services:", err);
  }
  return DEFAULT_SERVICES;
}

export async function saveService(service: Partial<DevEngineService>): Promise<string> {
  const id = service.id || service.slug || `service-${Date.now()}`;
  const docRef = doc(db, SERVICES_COLLECTION, id);
  await setDoc(
    docRef,
    {
      ...service,
      id,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return id;
}

export async function deleteService(serviceId: string): Promise<void> {
  await deleteDoc(doc(db, SERVICES_COLLECTION, serviceId));
}

export async function seedDefaultServices(): Promise<{ count: number }> {
  let count = 0;
  for (const s of DEFAULT_SERVICES) {
    const docRef = doc(db, SERVICES_COLLECTION, s.id);
    await setDoc(
      docRef,
      {
        ...s,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    count++;
  }
  return { count };
}

export async function submitServiceInquiry(
  inquiry: Omit<ServiceInquiry, "id" | "createdAt" | "status">
): Promise<string> {
  const colRef = collection(db, INQUIRIES_COLLECTION);
  const res = await addDoc(colRef, {
    ...inquiry,
    status: "NEW",
    createdAt: serverTimestamp(),
  });
  return res.id;
}

export async function getServiceInquiries(): Promise<ServiceInquiry[]> {
  try {
    const colRef = collection(db, INQUIRIES_COLLECTION);
    const snap = await getDocs(colRef);
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ServiceInquiry));
    return list.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });
  } catch (err) {
    console.error("Failed to fetch service inquiries:", err);
    return [];
  }
}

export async function updateInquiryStatus(
  inquiryId: string,
  status: "NEW" | "IN_REVIEW" | "CONTACTED" | "RESOLVED"
): Promise<void> {
  const docRef = doc(db, INQUIRIES_COLLECTION, inquiryId);
  await setDoc(docRef, { status, updatedAt: serverTimestamp() }, { merge: true });
}

export async function deleteServiceInquiry(inquiryId: string): Promise<void> {
  await deleteDoc(doc(db, INQUIRIES_COLLECTION, inquiryId));
}
