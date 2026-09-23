import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BlogPost } from "@/types/blog";

const COLLECTION_NAME = "blogs";

export const INITIAL_BLOGS: Omit<BlogPost, "id">[] = [
  {
    slug: "shipping-devengine-extreme-60fps-enterprise-studio",
    title: "Shipping DevEngine Extreme: How We Engineered a 60FPS Enterprise Studio in 90 Days",
    subtitle: "From WebGL Shader Pipelines to Sub-millisecond Cloud Latency",
    excerpt:
      "Building high-performance software requires discarding bloated templates. From WebGL shader pipelines to sub-millisecond API responses, discover how DevEngine was forged from the ground up without compromise.",
    category: "SUCCESS_STORY",
    coverImage:
      "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1400&auto=format&fit=crop",
    author: {
      name: "MD. ABDUL HAMIM LEON",
      role: "Founder & Lead Architect",
      avatarUrl: "/assets/DevEngine-emblem.png",
    },
    readTime: "7 min read",
    featured: true,
    gridSpan: "hero",
    tags: ["Success Story", "System Architecture", "Next.js", "WebGL", "Production"],
    order: 1,
    stats: [
      { label: "Target FPS", value: "60 FPS" },
      { label: "Build Time", value: "90 Days" },
      { label: "Lighthouse Score", value: "99/100" },
    ],
    isPublished: true,
    publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    content: `## The Ambition: No Compromise on Speed or Visuals

When we started architecting DevEngine Extreme, modern web engineering had become synonymous with bloated component libraries, slow hydration times, and cookie-cutter designs. We made a deliberate pact: **zero compromise on speed, fidelity, and responsiveness**.

### 1. Stripping Down the Abstractions
Every layer of third-party CSS utility was stripped in favor of raw semantic tokens and GPU-accelerated CSS properties. By decoupling our rendering pipeline from heavy DOM recalculations, our dynamic matrix canvases achieved constant 60 FPS on both mobile GPUs and high-end desktop workstations.

\`\`\`typescript
// Custom canvas memory manager to eliminate garbage collection stutters
export class CanvasMemoryPool {
  private buffers: WebGLBuffer[] = [];
  acquire(size: number): WebGLBuffer {
    return this.buffers.pop() || this.allocate(size);
  }
}
\`\`\`

### 2. Zero-Latency Cloud Architecture
By combining Firebase Edge listeners with incremental static regeneration, our data fetching layers respond in under 18ms globally. System licensing, project previews, and interactive simulations load instantly.

### 3. Key Takeaway
Extreme performance is not an afterthought; it is a discipline. When you value the user's attention down to the millisecond, your digital ecosystem stands in a league of its own.`,
  },
  {
    slug: "the-48-hour-outage-database-deadlock-failure-lesson",
    title: "The 48-Hour Outage: How a Database Deadlock Taught Us Extreme Resilience",
    subtitle: "A Raw Post-Mortem on What Broke, Why It Failed, and What We Rebuilt",
    excerpt:
      "We pushed an ambitious schema overhaul to production at 2 AM. Within minutes, connection pools choked, locking 12,000 queries. Here is the raw breakdown of what failed, how we recovered, and why we will never write migrations the same way again.",
    category: "FAILURE_LESSON",
    coverImage:
      "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1200&auto=format&fit=crop",
    author: {
      name: "MD. ABDUL HAMIM LEON",
      role: "Founder & Lead Architect",
      avatarUrl: "/assets/DevEngine-emblem.png",
    },
    readTime: "9 min read",
    featured: false,
    gridSpan: "tall",
    tags: ["Failure Story", "Post-Mortem", "Database", "Resilience", "DevOps"],
    order: 2,
    stats: [
      { label: "Downtime", value: "48 Hours" },
      { label: "Locked Queries", value: "12,400" },
      { label: "Data Loss", value: "0.00%" },
    ],
    isPublished: true,
    publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    content: `## The Night Everything Locked Up

It was 2:15 AM on a Sunday. We had just deployed what looked like a routine schema update to our primary relational cluster. What we didn't account for was an unindexed foreign key cascading across active real-time listeners.

Within 4 minutes, database connection pools reached 100% capacity. Queries began queuing, lock timeouts triggered domino crashes, and our heartbeat monitoring alerts lit up like a Christmas tree.

### What Actually Broke
1. **Unindexed Cascade Constraints**: A single update query locked the parent table, stalling all incoming purchase transactions.
2. **Aggressive Client Retry Loops**: Because clients weren't using exponential jitter backoff, thousands of client sockets hammered the dying connection pool every 500ms.
3. **Alert Fatigue**: Our critical alert channel was flooded with secondary warnings, masking the actual root-cause lock ID.

### How We Recovered Without Losing A Single Byte
- We isolated the database replica immediately and diverted reads to cold snapshots.
- Manually audited Postgres locks using PID termination scripts.
- Implemented circuit-breaker middleware with exponential jitter backoff in the client SDK.

### The Permanent Safeguards We Enacted
Today, no migration touches production without automated shadow-traffic dry runs. We turned our costliest failure into our strongest architectural bastion.`,
  },
  {
    slug: "crossing-the-horizon-100-enterprise-licenses-deployed",
    title: "Crossing the Horizon: 100+ Enterprise Licenses Deployed Worldwide",
    subtitle: "Milestones in Independent Software Licensing & Global Expansion",
    excerpt:
      "From independent developers to tier-1 enterprise software teams, DevEngine production licenses now power mission-critical software across 14 countries. A look at the numbers, trials, and what comes next.",
    category: "ACHIEVEMENT",
    coverImage:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop",
    author: {
      name: "MD. ABDUL HAMIM LEON",
      role: "Founder & Lead Architect",
      avatarUrl: "/assets/DevEngine-emblem.png",
    },
    readTime: "5 min read",
    featured: false,
    gridSpan: "wide",
    tags: ["Milestone", "Enterprise", "Commercial License", "Scaling"],
    order: 3,
    stats: [
      { label: "Licenses Deployed", value: "100+" },
      { label: "Global Reach", value: "14 Countries" },
      { label: "Customer SLA", value: "< 24 Hrs" },
    ],
    isPublished: true,
    publishedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    content: `## Beyond the Sandbox

When DevEngine was merely a prototype terminal interface, skeptics warned us that high-end software studios could never distribute commercial source licenses directly to global enterprises without massive middleman marketplaces.

Today, we officially crossed our 100th enterprise production license deployment.

### Where DevEngine Systems Run Today
Our codebases and systems are active across:
- Fintech clearing engines in Singapore and Tokyo
- Logistics microservice architectures in Germany
- AI pipeline orchestration dashboards in North America
- High-concurrency educational platforms in Bangladesh and Southeast Asia

### The Power of Full Ownership
Our customers choose DevEngine because we don't sell bloated monthly lock-ins—we grant full source sovereignty. When a client acquires a DevEngine license, they own their destiny.`,
  },
  {
    slug: "zero-latency-reactive-pipelines-nextjs-threejs-firebase",
    title: "Zero-Latency Reactive Pipelines: Mastering Next.js 15, Three.js & Firebase",
    subtitle: "Eliminating Frame Drops When Heavy 3D Graphics Meet Live Real-Time State",
    excerpt:
      "How to avoid rendering bottlenecks when mixing heavy 3D canvas computations with server-driven reactive state. Our benchmark tests, garbage collection rules, and optimization techniques.",
    category: "ENGINEERING",
    coverImage:
      "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop",
    author: {
      name: "MD. ABDUL HAMIM LEON",
      role: "Founder & Lead Architect",
      avatarUrl: "/assets/DevEngine-emblem.png",
    },
    readTime: "8 min read",
    featured: false,
    gridSpan: "normal",
    tags: ["Engineering", "WebGL", "Three.js", "React 19", "Performance"],
    order: 4,
    stats: [
      { label: "GC Pauses", value: "0 ms" },
      { label: "Render Budget", value: "16.6 ms" },
      { label: "Draw Calls", value: "< 45" },
    ],
    isPublished: true,
    publishedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString(),
    content: `## The WebGL Performance Paradox

Combining modern React lifecycle rendering with WebGL animation loops frequently leads to severe memory leaks, context loss, and micro-stuttering. In this technical deep dive, we outline the exact architecture we use inside DevEngine.

### Core Architectural Mandates
1. **Never Re-instantiate Geometries inside React Rerenders**: Keep Three.js meshes strictly isolated in a singleton scene manager outside the React virtual DOM tree.
2. **Use InstancedMesh for Particle Systems**: Rendering 5,000 independent particles dropped frame rates to 24 FPS. Migrating to a single \`InstancedMesh\` with a dynamic transformation matrix brought rendering back to a rock-solid 60 FPS.
3. **Throttled Firebase Snapshot Dispatching**: Instead of triggering full state refreshes on every incoming snapshot, updates are buffered in an off-screen ring buffer and flushed once per requestAnimationFrame tick.`,
  },
  {
    slug: "extreme-software-philosophy-building-without-compromise",
    title: "The Extreme Software Philosophy: Why We Build Without Compromise",
    subtitle: "Craftsmanship, Discipline, and The Aesthetics of Code",
    excerpt:
      "Software isn't just utility—it is digital craftsmanship. A look inside our architectural standards, code quality mandates, and relentless pursuit of performance.",
    category: "STUDIO_CULTURE",
    coverImage:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=1200&auto=format&fit=crop",
    author: {
      name: "MD. ABDUL HAMIM LEON",
      role: "Founder & Lead Architect",
      avatarUrl: "/assets/DevEngine-emblem.png",
    },
    readTime: "4 min read",
    featured: false,
    gridSpan: "normal",
    tags: ["Philosophy", "Craftsmanship", "Studio Culture", "Quality"],
    order: 5,
    isPublished: true,
    publishedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    content: `## The Standard We Hold

At DevEngine, we reject the notion that business software should feel dull, slow, or generic. Software is the highest form of modern architecture. When an engineer steps into our codebase, every indentation, every interface definition, and every animation easing curve must reflect deliberate intent.

### Our Three Guiding Principles:
1. **Speed is the Ultimate Feature**: If it takes more than 200ms to respond, it is broken.
2. **Clarity Over Cleverness**: Code is read 100 times more often than it is written.
3. **Resilience by Design**: Assume networks will fail, disks will throttle, and users will make mistakes. Build systems that absorb stress and recover automatically.`,
  },
];

/**
 * Recursively removes undefined fields from objects before saving to Firestore.
 * Firestore throws a fatal error if any field is undefined.
 */
export function sanitizeFirestoreData<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeFirestoreData(value);
    } else {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

/**
 * Sorts blogs consistently:
 * 1. Respects explicit display order (order: 1, 2, ... 9, 10)
 * 2. Unordered posts are assigned the remaining natural slots (1..8) by publication date
 * 3. Guarantees posts with order 9 and 10 stay at position 9 and 10
 */
export function sortBlogList(list: BlogPost[]): BlogPost[] {
  const explicitOrders = new Set<number>();
  for (const b of list) {
    if (typeof b.order === "number") {
      explicitOrders.add(b.order);
    }
  }

  // Items without explicit order sorted by date descending (their natural sequence)
  const unOrdered = list
    .filter((b) => typeof b.order !== "number")
    .sort((a, b) => {
      const timeA = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    });

  // Assign virtual order to unordered items in available slots (1, 2, 3...)
  let slot = 1;
  const virtualMap = new Map<string, number>();
  for (const item of unOrdered) {
    while (explicitOrders.has(slot)) {
      slot++;
    }
    virtualMap.set(item.id, slot);
    slot++;
  }

  return list.slice().sort((a, b) => {
    const orderA = typeof a.order === "number" ? a.order : virtualMap.get(a.id) ?? 999;
    const orderB = typeof b.order === "number" ? b.order : virtualMap.get(b.id) ?? 999;
    return orderA - orderB;
  });
}

/**
 * Fetch all published blogs for public view
 */
export async function getPublishedBlogs(): Promise<BlogPost[]> {
  try {
    // Single-field query avoids Firestore composite index requirements
    const q = query(
      collection(db, COLLECTION_NAME),
      where("isPublished", "==", true)
    );
    const snap = await getDocs(q);

    // Deduplicate by slug in case of duplicate seeds
    const uniqueMap = new Map<string, BlogPost>();
    for (const d of snap.docs) {
      const post = { id: d.id, ...(d.data() as any) } as BlogPost;
      const key = post.slug || d.id;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, post);
      }
    }

    const list: BlogPost[] = Array.from(uniqueMap.values());
    return sortBlogList(list);
  } catch (err) {
    console.error("Error fetching published blogs:", err);
    return [];
  }
}

/**
 * Fetch all blogs for admin management
 */
export async function getAllBlogs(): Promise<BlogPost[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    const list: BlogPost[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    return sortBlogList(list);
  } catch (err) {
    console.error("Error fetching all blogs:", err);
    return [];
  }
}

/**
 * Fetch single blog by slug
 */
export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
  try {
    // Query only by slug to avoid composite index requirement
    const q = query(
      collection(db, COLLECTION_NAME),
      where("slug", "==", slug)
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      // Fallback: try checking if ID matches slug
      const docRef = doc(db, COLLECTION_NAME, slug);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...(docSnap.data() as any) };
      }
      return null;
    }
    const docFound = snap.docs[0];
    return { id: docFound.id, ...(docFound.data() as any) };
  } catch (err) {
    console.error("Error fetching blog by slug:", err);
    return null;
  }
}

/**
 * Create blog post
 */
export async function createBlog(
  data: Omit<BlogPost, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = doc(collection(db, COLLECTION_NAME));
  const now = new Date().toISOString();
  const newPost: BlogPost = {
    ...data,
    id: docRef.id,
    order: typeof data.order === "number" ? data.order : 1,
    createdAt: now,
    updatedAt: now,
    publishedAt: data.isPublished ? data.publishedAt || now : "",
  };
  const sanitized = sanitizeFirestoreData(newPost);
  await setDoc(docRef, sanitized);
  return docRef.id;
}

/**
 * Update blog post
 */
export async function updateBlog(
  id: string,
  data: Partial<BlogPost>
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  const sanitized = sanitizeFirestoreData({
    ...data,
    updatedAt: new Date().toISOString(),
  });
  await updateDoc(docRef, sanitized);
}

/**
 * Delete blog post
 */
export async function deleteBlog(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Seed initial chronicles to Firestore if empty or on demand
 */
export async function seedInitialBlogs(): Promise<number> {
  try {
    let seededCount = 0;
    for (const blog of INITIAL_BLOGS) {
      // Check if already exists by slug
      const q = query(collection(db, COLLECTION_NAME), where("slug", "==", blog.slug));
      const snap = await getDocs(q);
      if (snap.empty) {
        const docRef = doc(collection(db, COLLECTION_NAME));
        await setDoc(docRef, {
          ...blog,
          id: docRef.id,
        });
        seededCount++;
      }
    }
    return seededCount;
  } catch (err) {
    console.warn("Notice: Initial blogs seed could not write to Firestore (requires admin login):", err);
    return 0;
  }
}
