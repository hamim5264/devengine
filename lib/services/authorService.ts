import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { uploadStorageAsset } from "@/lib/services/storageAssetService";
import type { BlogAuthor } from "@/types/blog";

export interface BlogAuthorProfile {
  id?: string;
  name: string;
  role: string;
  avatarUrl: string;
  updatedAt?: string;
}

const AUTHORS_COLLECTION = "blog_authors";

export const DEFAULT_AUTHOR: BlogAuthorProfile = {
  name: "MD. ABDUL HAMIM LEON",
  role: "Founder & Lead Architect",
  avatarUrl: "/assets/DevEngine-emblem.png",
};

function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "author";
}

/**
 * Fetch all saved author profiles from Firestore.
 * Automatically aggregates from `blog_authors` collection, existing `blogs` records,
 * and ensures standard default authors are available.
 */
export async function getSavedAuthors(): Promise<BlogAuthorProfile[]> {
  const map = new Map<string, BlogAuthorProfile>();

  // 1. Seed standard default
  map.set(DEFAULT_AUTHOR.name.toLowerCase(), { ...DEFAULT_AUTHOR, id: slugifyName(DEFAULT_AUTHOR.name) });

  try {
    // 2. Fetch from dedicated blog_authors collection
    const authorsSnap = await getDocs(collection(db, AUTHORS_COLLECTION));
    authorsSnap.forEach((d) => {
      const data = d.data() as BlogAuthorProfile;
      if (data?.name) {
        map.set(data.name.trim().toLowerCase(), {
          id: d.id,
          name: data.name.trim(),
          role: data.role || "Author",
          avatarUrl: data.avatarUrl || "",
          updatedAt: data.updatedAt,
        });
      }
    });

    // 3. Collect any historical authors from existing blogs
    const blogsSnap = await getDocs(collection(db, "blogs"));
    blogsSnap.forEach((d) => {
      const data = d.data();
      const author = data?.author as BlogAuthor | undefined;
      if (author?.name) {
        const key = author.name.trim().toLowerCase();
        if (!map.has(key) || !map.get(key)?.avatarUrl) {
          map.set(key, {
            id: slugifyName(author.name),
            name: author.name.trim(),
            role: author.role || "Author",
            avatarUrl: author.avatarUrl || "",
          });
        }
      }
    });
  } catch (err) {
    console.debug("getSavedAuthors notice:", err);
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Save or update an author profile in the database.
 * Used automatically when writing or saving a blog post.
 */
export async function saveAuthorProfile(author: BlogAuthor): Promise<void> {
  if (!author?.name?.trim()) return;

  const id = slugifyName(author.name);
  const authorRef = doc(db, AUTHORS_COLLECTION, id);

  try {
    await setDoc(
      authorRef,
      {
        name: author.name.trim(),
        role: author.role?.trim() || "Author",
        avatarUrl: author.avatarUrl?.trim() || "",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.debug("saveAuthorProfile notice:", err);
  }
}

/**
 * Upload an author avatar image to Firebase Storage and get back a permanent URL.
 */
export async function uploadAuthorAvatar(file: File, authorName: string): Promise<string> {
  const prefix = slugifyName(authorName || "author");
  return uploadStorageAsset(file, "blog_authors", prefix, 10 * 1024 * 1024);
}
