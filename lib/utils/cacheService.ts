// lib/utils/cacheService.ts

/**
 * Lightweight client-side caching using localStorage.
 * Safely handles SSR, quota limits, and JSON serialization.
 */

export function getCachedData<T>(key: string, fallback: T): T;
export function getCachedData<T>(key: string): T | null;
export function getCachedData<T>(key: string, fallback?: T): T | null {
  if (typeof window === "undefined") return fallback !== undefined ? fallback : null;
  try {
    const raw = localStorage.getItem(`de_cache_${key}`);
    if (!raw) return fallback !== undefined ? fallback : null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[Cache] Failed to read cache for key "${key}":`, err);
    return fallback !== undefined ? fallback : null;
  }
}

export function setCachedData<T>(key: string, data: T): void {
  if (typeof window === "undefined" || !data) return;
  try {
    localStorage.setItem(`de_cache_${key}`, JSON.stringify(data));
  } catch (err) {
    console.warn(`[Cache] Failed to set cache for key "${key}":`, err);
  }
}

export function removeCachedData(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(`de_cache_${key}`);
  } catch {}
}
