import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/router";
import { auth } from "@/lib/firebase";
import { bootstrapDevKitty, sendDevKittyMessage, devKittyError } from "@/lib/devkitty/client";
import type { DevKittyBootstrap, DevKittyMessage } from "@/types/devkitty";
import DevKittyPanel from "./DevKittyPanel";
interface DevKittyState {
  open: () => void; close: () => void; hidden: boolean; isOpen: boolean;
  setEmployeeWelcomeReady: (uid: string, ready: boolean) => void;
  bootstrap: DevKittyBootstrap | null; loading: boolean; error: string; messages: DevKittyMessage[];
  sending: boolean; send: (text: string) => Promise<void>; retry: () => Promise<void>; reset: () => void; reload: () => Promise<void>;
}
const Context = createContext<DevKittyState | null>(null);
export function useDevKitty() { const value = useContext(Context); if (!value) throw new Error("DevKittyProvider is required."); return value; }
const greetingMessage = (data: DevKittyBootstrap): DevKittyMessage => ({ id: "greeting", role: "assistant", content: data.greeting, greeting: true });
export default function DevKittyProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isOpen, setOpen] = useState(false), [hidden, setHidden] = useState(false);
  const [employeeWelcome, setEmployeeWelcome] = useState<{ uid: string; ready: boolean } | null>(null);
  const setEmployeeWelcomeReady = useCallback((uid: string, ready: boolean) => {
    setEmployeeWelcome(current => current?.uid === uid && current.ready === ready ? current : { uid, ready });
  }, []);
  const [bootstrap, setBootstrap] = useState<DevKittyBootstrap | null>(null), [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<DevKittyMessage[]>([]), [sending, setSending] = useState(false), [error, setError] = useState("");
  const bootstrapEpoch = useRef(0), requestEpoch = useRef(0), messagesRef = useRef<DevKittyMessage[]>([]), pending = useRef(false), welcomed = useRef(new Set<string>());
  messagesRef.current = messages;
  const reload = useCallback(async () => {
    const epoch = ++bootstrapEpoch.current;
    setLoading(true); setError("");
    try {
      const data = await bootstrapDevKitty(); if (epoch !== bootstrapEpoch.current) return;
      setBootstrap(data); setMessages(current => current.length && !current.every(item => item.greeting) ? current : [greetingMessage(data)]);
    } catch (error) { if (epoch === bootstrapEpoch.current) setError(devKittyError(error)); }
    finally { if (epoch === bootstrapEpoch.current) setLoading(false); }
  }, []);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, () => {
      requestEpoch.current++; bootstrapEpoch.current++; pending.current = false;
      setSending(false); setOpen(false); setMessages([]); messagesRef.current = []; setBootstrap(null);
      setEmployeeWelcome(null);
      void reload();
    });
    return () => { unsubscribe(); bootstrapEpoch.current++; requestEpoch.current++; };
  }, [reload]);
  useEffect(() => {
    function update() {
      try { const uid = auth.currentUser?.uid; setHidden(!!uid && localStorage.getItem(`devkitty_hidden_${uid}`) === "true"); } catch { setHidden(false); }
    }
    update(); window.addEventListener("devkitty_visibility_change", update);
    const unsubscribe = onAuthStateChanged(auth, update);
    return () => { unsubscribe(); window.removeEventListener("devkitty_visibility_change", update); };
  }, []);
  useEffect(() => { if (hidden) setOpen(false); }, [hidden]);
  useEffect(() => {
    if (!bootstrap || bootstrap.role !== "employee" || !bootstrap.enabled || !bootstrap.autoEmployeeGreeting || hidden || !["/staff/dashboard", "/employee/dashboard"].includes(router.pathname)) return;
    // Profile onboarding must finish or be explicitly skipped before the greeting.
    if (!employeeWelcome?.ready || employeeWelcome.uid !== auth.currentUser?.uid) return;
    const key = `devkitty_welcome:${bootstrap.session}`;
    try { if (sessionStorage.getItem(key)) return; } catch {}
    if (welcomed.current.has(key)) return;
    const timer = window.setTimeout(() => {
      welcomed.current.add(key); try { sessionStorage.setItem(key, "1"); } catch {}
      setOpen(true);
    }, 850);
    return () => clearTimeout(timer);
  }, [bootstrap, hidden, router.pathname, employeeWelcome]);
  useEffect(() => { const update = () => { void reload(); }; window.addEventListener("devkitty_settings_updated", update); return () => window.removeEventListener("devkitty_settings_updated", update); }, [reload]);
  const open = () => { setOpen(true); if (!loading) void reload(); };
  const close = () => setOpen(false);
  async function perform(history: DevKittyMessage[]) {
    if (pending.current) return; pending.current = true;
    const epoch = ++requestEpoch.current;
    setSending(true); setError("");
    try {
      const answer = await sendDevKittyMessage(history);
      if (epoch !== requestEpoch.current) return;
      if (bootstrap && answer.role !== bootstrap.role) { setMessages([]); void reload(); return; }
      setBootstrap(current => current ? { ...current, enabled: !answer.maintenance, ...(!answer.maintenance ? { configured: true } : {}) } : current);
      setMessages(current => [...current, { id: crypto.randomUUID(), role: "assistant", content: answer.text, links: answer.links, sources: answer.sources, truncated: answer.truncated }]);
    } catch (error) { if (epoch === requestEpoch.current) setError(devKittyError(error)); }
    finally { if (epoch === requestEpoch.current) { setSending(false); pending.current = false; } }
  }
  async function send(text: string) {
    const content = text.trim(); if (!content || pending.current) return;
    const history = [...messagesRef.current, { id: crypto.randomUUID(), role: "user" as const, content }];
    messagesRef.current = history; setMessages(history); await perform(history);
  }
  async function retry() { if (messagesRef.current.at(-1)?.role === "user") await perform(messagesRef.current); else await reload(); }
  function reset() { if (pending.current) return; setError(""); setMessages(bootstrap ? [greetingMessage(bootstrap)] : []); }
  return <Context.Provider value={{ open, close, hidden, isOpen, setEmployeeWelcomeReady, bootstrap, loading, error, messages, sending, send, retry, reset, reload }}>{children}{isOpen && !hidden && <DevKittyPanel />}</Context.Provider>;
}
