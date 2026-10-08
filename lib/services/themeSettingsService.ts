import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ThemeModeSettings {
  allowDarkMode: boolean;
  allowLightMode: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_THEME_MODES: ThemeModeSettings = {
  allowDarkMode: true,
  allowLightMode: true,
};

const SYSTEM_COLLECTION = "system_settings";
const THEME_DOC_ID = "theme_modes";

/**
 * Retrieve current theme modes configuration from Firestore
 */
export async function getThemeModeSettings(): Promise<ThemeModeSettings> {
  try {
    const docRef = doc(db, SYSTEM_COLLECTION, THEME_DOC_ID);
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return DEFAULT_THEME_MODES;
    }

    const data = snap.data() as Partial<ThemeModeSettings>;
    return {
      ...DEFAULT_THEME_MODES,
      ...data,
    };
  } catch (err) {
    console.warn("[themeSettingsService] Failed to fetch theme modes, using defaults:", err);
    return DEFAULT_THEME_MODES;
  }
}

/**
 * Real-time listener for global theme mode settings changes
 */
export function subscribeThemeModeSettings(
  callback: (settings: ThemeModeSettings) => void
): () => void {
  try {
    const docRef = doc(db, SYSTEM_COLLECTION, THEME_DOC_ID);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<ThemeModeSettings>;
          callback({
            ...DEFAULT_THEME_MODES,
            ...data,
          });
        } else {
          callback(DEFAULT_THEME_MODES);
        }
      },
      (error) => {
        console.warn("[themeSettingsService] onSnapshot error:", error);
        callback(DEFAULT_THEME_MODES);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error("[themeSettingsService] Subscription failed:", err);
    return () => {};
  }
}

/**
 * Admin: Update theme modes configuration in Firestore
 */
export async function updateThemeModeSettings(
  settings: Partial<ThemeModeSettings>,
  adminEmail: string = "hamim.leon@gmail.com"
): Promise<void> {
  const docRef = doc(db, SYSTEM_COLLECTION, THEME_DOC_ID);
  const nowIso = new Date().toISOString();

  await setDoc(
    docRef,
    {
      ...settings,
      updatedAt: nowIso,
      updatedBy: adminEmail,
    },
    { merge: true }
  );
}
