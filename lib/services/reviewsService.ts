import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ReviewRecord, ReviewStatus, CreateReviewInput } from "@/types/review";

const COLLECTION_NAME = "reviews";

/**
 * Standardize Firestore dates/timestamps to ISO string
 */
function parseDate(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "string") return val;
  if (val.toDate && typeof val.toDate === "function") {
    return val.toDate().toISOString();
  }
  if (val.seconds) {
    return new Date(val.seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Fetch all approved reviews for public Trust Wall
 * Also includes legacy reviews that have no status set yet.
 */
export async function getPublicApprovedReviews(): Promise<ReviewRecord[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    const list: ReviewRecord[] = [];

    for (const d of snap.docs) {
      const data = d.data();
      const status: ReviewStatus = data.status || "APPROVED"; // Legacy reviews default to APPROVED

      // Only show approved
      if (status === "APPROVED") {
        list.push({
          id: d.id,
          reviewerName: data.reviewerName || "Verified Client",
          reviewerRole: data.reviewerRole || "Software Engineer / Client",
          company: data.company || "",
          avatarUrl: data.avatarUrl || "",
          rating: Number(data.rating) || 5,
          reviewText: data.reviewText || "",
          status: "APPROVED",
          featured: !!data.featured,
          createdAt: parseDate(data.createdAt),
          updatedAt: parseDate(data.updatedAt),
          verifiedPurchase: data.verifiedPurchase !== false,
          userId: data.userId || "",
        });
      }
    }

    // Sort descending by date in memory (no composite index needed)
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return list;
  } catch (err) {
    console.error("Error fetching public approved reviews:", err);
    return [];
  }
}

/**
 * Fetch all reviews for admin panel (Pending, Approved, Rejected)
 */
export async function getAllReviewsAdmin(): Promise<ReviewRecord[]> {
  try {
    const snap = await getDocs(collection(db, COLLECTION_NAME));
    const list: ReviewRecord[] = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        reviewerName: data.reviewerName || "Anonymous",
        reviewerRole: data.reviewerRole || "Client / Developer",
        company: data.company || "",
        avatarUrl: data.avatarUrl || "",
        rating: Number(data.rating) || 5,
        reviewText: data.reviewText || "",
        status: (data.status as ReviewStatus) || "APPROVED",
        featured: !!data.featured,
        createdAt: parseDate(data.createdAt),
        updatedAt: parseDate(data.updatedAt),
        verifiedPurchase: data.verifiedPurchase !== false,
        userId: data.userId || "",
      };
    });

    // Sort descending by date in memory
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return list;
  } catch (err) {
    console.error("Error fetching admin reviews:", err);
    return [];
  }
}

/**
 * Public submission of a new review
 * Always starts in PENDING status until approved by admin.
 */
export async function submitReview(input: CreateReviewInput): Promise<string> {
  const docRef = doc(collection(db, COLLECTION_NAME));
  const now = new Date().toISOString();

  const newReview = {
    reviewerName: input.reviewerName.trim(),
    reviewerRole: input.reviewerRole?.trim() || "Verified Client",
    company: input.company?.trim() || "",
    avatarUrl: input.avatarUrl || "",
    rating: Math.min(5, Math.max(1, input.rating || 5)),
    reviewText: input.reviewText.trim(),
    status: "PENDING" as ReviewStatus,
    featured: false,
    createdAt: now,
    updatedAt: now,
    verifiedPurchase: true,
    userId: input.userId || "",
  };

  await setDoc(docRef, newReview);
  return docRef.id;
}

/**
 * Admin: Update review status (APPROVED, REJECTED, PENDING)
 */
export async function updateReviewStatus(
  id: string,
  status: ReviewStatus
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    status,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Admin: Toggle featured status
 */
export async function toggleFeatureReview(
  id: string,
  featured: boolean
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    featured,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Admin: Delete review permanently
 */
export async function deleteReview(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

/**
 * Admin: Create or update complete review document
 */
export async function saveReviewAdmin(
  id: string | null,
  data: Partial<ReviewRecord>
): Promise<string> {
  const now = new Date().toISOString();
  if (id) {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: now,
    });
    return id;
  } else {
    const docRef = doc(collection(db, COLLECTION_NAME));
    await setDoc(docRef, {
      ...data,
      id: docRef.id,
      status: data.status || "APPROVED",
      createdAt: data.createdAt || now,
      updatedAt: now,
    });
    return docRef.id;
  }
}

export const DEFAULT_FEATURED_REVIEWS: ReviewRecord[] = [
  {
    id: "featured-1",
    reviewerName: "Shirajom Monira",
    reviewerRole: "Student Project Purchaser",
    company: "DevEngine Archive",
    rating: 5,
    reviewText:
      "Great quality and easy to understand! I purchased a student project from DevEngine and was amazed by how clean and professional everything looked. Highly recommend!",
    status: "APPROVED",
    featured: true,
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "featured-2",
    reviewerName: "Alex Rivera",
    reviewerRole: "Lead Developer, TechFlow",
    company: "TechFlow Systems",
    rating: 5,
    reviewText:
      "The attention to detail is unparalleled. DevEngine provided an architectural foundation that accelerated our time-to-market by months. Simply exceptional engineering.",
    status: "APPROVED",
    featured: true,
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "featured-3",
    reviewerName: "Elena Lin",
    reviewerRole: "Creative Director",
    company: "Apex Studio",
    rating: 5,
    reviewText:
      "A game-changer for our studio. The clean architecture and premium design components let us focus on what really matters. 10/10 craftsmanship.",
    status: "APPROVED",
    featured: true,
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

/**
 * Seed all default 3 featured reviews into Firestore
 */
export async function seedDefaultReviews(): Promise<number> {
  let count = 0;
  for (const review of DEFAULT_FEATURED_REVIEWS) {
    const docRef = doc(db, COLLECTION_NAME, review.id);
    await setDoc(
      docRef,
      {
        ...review,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    count++;
  }
  return count;
}
