import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  addDoc,
  Timestamp,
} from "firebase/firestore";

export interface AnalyticsSummary {
  totalViews: number;
  todayViews: number;
  uniqueVisitors: number;
  todayDate: string;
  lastVisitAt?: any;
}

export interface ActivityLog {
  id: string;
  type: "order" | "visit" | "project" | "system" | "cms";
  title: string;
  description: string;
  timestamp: any;
  icon?: string;
  status?: string;
}

const ANALYTICS_DOC = "overview";
const ANALYTICS_COLLECTION = "site_analytics";
const ACTIVITY_COLLECTION = "activity_logs";

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0]; // YYYY-MM-DD
}

/**
 * Record a public page view in Firestore.
 * Automatically updates total views, today's views, and unique visitors.
 * Completely real metrics — zero fake numbers.
 */
export async function recordPageView(path: string): Promise<void> {
  if (typeof window === "undefined") return;

  // Respect user cookie preferences if they explicitly declined non-essential tracking
  const cookieConsent = localStorage.getItem("devengine_cookie_consent");
  if (cookieConsent === "declined") {
    return;
  }

  // Prevent counting internal prefetch or repeated bursts within 10 seconds on the same path
  const lastPath = sessionStorage.getItem("devengine_last_view_path");
  const lastTime = Number(sessionStorage.getItem("devengine_last_view_time") || 0);
  const now = Date.now();

  if (lastPath === path && now - lastTime < 10000) {
    return;
  }
  sessionStorage.setItem("devengine_last_view_path", path);
  sessionStorage.setItem("devengine_last_view_time", String(now));

  // Genuine unique visitor device tracking via localStorage
  let visitorId = localStorage.getItem("devengine_visitor_id");
  const isNewUniqueVisitor = !visitorId;
  if (!visitorId) {
    visitorId = "vis_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
    localStorage.setItem("devengine_visitor_id", visitorId);
  }

  // Session tracking to identify unique browsing sessions
  const isNewSession = !sessionStorage.getItem("devengine_session_tracked");
  if (isNewSession) {
    sessionStorage.setItem("devengine_session_tracked", "true");
  }

  const todayStr = getTodayString();
  const analyticsRef = doc(db, ANALYTICS_COLLECTION, ANALYTICS_DOC);

  try {
    const snap = await getDoc(analyticsRef);
    if (!snap.exists()) {
      // Initialize with exact real counts
      await setDoc(analyticsRef, {
        totalViews: 1,
        todayViews: 1,
        uniqueVisitors: isNewUniqueVisitor ? 1 : 0,
        todayDate: todayStr,
        lastVisitAt: serverTimestamp(),
      });
    } else {
      const data = snap.data();
      const isSameDay = data.todayDate === todayStr;

      if (isSameDay) {
        await updateDoc(analyticsRef, {
          totalViews: increment(1),
          todayViews: increment(1),
          uniqueVisitors: isNewUniqueVisitor ? increment(1) : increment(0),
          lastVisitAt: serverTimestamp(),
        });
      } else {
        // New day rollover
        await updateDoc(analyticsRef, {
          totalViews: increment(1),
          todayViews: 1,
          uniqueVisitors: isNewUniqueVisitor ? increment(1) : increment(0),
          todayDate: todayStr,
          lastVisitAt: serverTimestamp(),
        });
      }
    }

    // Record authentic activity log when a new session arrives
    if (isNewSession) {
      const displayPath = path === "/" ? "Home Platform" : path;
      await logActivity({
        type: "visit",
        title: "Visitor Traffic",
        description: `Visitor browsing ${displayPath}`,
        icon: "visibility",
      });
    }
  } catch (err) {
    // Non-blocking for client experience
    console.debug("Analytics recordPageView notice:", err);
  }
}

/**
 * Fetch current real site analytics for admin dashboard
 */
export async function getSiteAnalytics(): Promise<AnalyticsSummary> {
  const todayStr = getTodayString();
  const analyticsRef = doc(db, ANALYTICS_COLLECTION, ANALYTICS_DOC);

  try {
    const snap = await getDoc(analyticsRef);
    if (snap.exists()) {
      const data = snap.data();
      const isSameDay = data.todayDate === todayStr;
      return {
        totalViews: data.totalViews ?? 0,
        todayViews: isSameDay ? (data.todayViews ?? 0) : 0,
        uniqueVisitors: data.uniqueVisitors ?? 0,
        todayDate: todayStr,
        lastVisitAt: data.lastVisitAt,
      };
    } else {
      // Seed initial summary document with genuine 0s
      const initial: AnalyticsSummary = {
        totalViews: 0,
        todayViews: 0,
        uniqueVisitors: 0,
        todayDate: todayStr,
      };
      await setDoc(analyticsRef, {
        ...initial,
        lastVisitAt: serverTimestamp(),
      });
      return initial;
    }
  } catch (err) {
    console.error("Error fetching analytics:", err);
    return {
      totalViews: 0,
      todayViews: 0,
      uniqueVisitors: 0,
      todayDate: todayStr,
    };
  }
}

/**
 * Log a structured real activity event into activity_logs collection
 */
export async function logActivity(activity: {
  type: ActivityLog["type"];
  title: string;
  description: string;
  icon?: string;
  status?: string;
}): Promise<void> {
  try {
    await addDoc(collection(db, ACTIVITY_COLLECTION), {
      ...activity,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.debug("logActivity notice:", err);
  }
}

/**
 * Fetch latest genuine activities for dashboard timeline.
 * Returns only real logged activities from Firestore — zero fake orders or fake numbers.
 */
export async function getRecentActivities(maxItems: number = 8): Promise<ActivityLog[]> {
  try {
    const q = query(
      collection(db, ACTIVITY_COLLECTION),
      orderBy("timestamp", "desc"),
      limit(maxItems)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      return [];
    }

    return snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ActivityLog[];
  } catch (err) {
    console.debug("getRecentActivities notice:", err);
    return [];
  }
}

/**
 * Admin utility: Reset analytics counters to zero
 */
export async function resetAnalyticsToZero(): Promise<void> {
  const todayStr = getTodayString();
  const analyticsRef = doc(db, ANALYTICS_COLLECTION, ANALYTICS_DOC);
  await setDoc(analyticsRef, {
    totalViews: 0,
    todayViews: 0,
    uniqueVisitors: 0,
    todayDate: todayStr,
    lastVisitAt: serverTimestamp(),
  });
}
