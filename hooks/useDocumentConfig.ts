import { useEffect, useState } from "react";
import { getCachedData, setCachedData } from "@/lib/utils/cacheService";

const inFlight = new Map<string, Promise<unknown>>();

/** Render immediately, restore cached CMS content after hydration, and refresh in the background. */
export function useDocumentConfig<T>(key: string, initial: T, fetchConfig: () => Promise<T>): T {
  const [config, setConfig] = useState<T>(initial);
  useEffect(() => {
    let mounted = true;
    const cached = getCachedData<T | null>(`document_v1_${key}`, null);
    if (cached) setConfig(cached);
    let request = inFlight.get(key) as Promise<T> | undefined;
    if (!request) {
      request = fetchConfig();
      inFlight.set(key, request);
    }
    const activeRequest = request;
    activeRequest.then((fresh) => {
      if (mounted) setConfig(fresh);
      setCachedData(`document_v1_${key}`, fresh);
    }).catch((error) => console.warn(`Unable to refresh ${key}:`, error)).finally(() => {
      if (inFlight.get(key) === activeRequest) inFlight.delete(key);
    });
    return () => { mounted = false; };
  }, [key, fetchConfig]);
  return config;
}
