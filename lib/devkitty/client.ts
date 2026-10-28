import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { app } from "@/lib/firebase";
import type { DevKittyBootstrap, DevKittyMessage, DevKittyAnswer, DevKittyAdminState, DevKittyModel, DevKittyInsights } from "@/types/devkitty";

function callable<Request, Response>(name: string) { return httpsCallable<Request, Response>(getFunctions(app, "us-central1"), name, { timeout: 125000 }); }

export async function bootstrapDevKitty(surface: "public" | "workspace" = "workspace") { return (await callable<{surface:string}, DevKittyBootstrap>("devkittyBootstrap")({surface})).data; }

export async function sendDevKittyMessage(messages: DevKittyMessage[], surface: "public" | "workspace" = "workspace") {
  const history = messages.filter(message => !message.greeting).slice(-16).map(({ role, content }) => ({ role, content }));
  while (history.length > 1 && history.reduce((total, item) => total + item.content.length, 0) > 28000) history.shift();
  return (await callable<{ messages: typeof history; surface:string }, DevKittyAnswer>("devkittyChat")({ messages: history, surface })).data;
}

async function callDevKittyAdmin<T>(data: Record<string, unknown>): Promise<T> {
  try {
    const auth = getAuth(app);
    const token = await auth.currentUser?.getIdToken();
    if (token) {
      const response = await fetch("/api/admin/devkitty", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        return (await response.json()) as T;
      }
    }
  } catch {
    // Fall back to callable
  }
  return (await callable<Record<string, unknown>, T>("devkittyAdmin")(data)).data;
}

export async function readDevKittyAdmin() { return callDevKittyAdmin<DevKittyAdminState>({ action: "read" }); }
export async function readDevKittyInsights() { return callDevKittyAdmin<DevKittyInsights>({ action: "insights" }); }
export async function devKittyAdminAction(data: Record<string, unknown>) { return callDevKittyAdmin<Record<string, unknown>>(data); }
export async function getDevKittyModels() {
  const res = await callDevKittyAdmin<{ models: DevKittyModel[] }>({ action: "models" });
  return res.models;
}

export function devKittyError(error: unknown) {
  if (typeof error === "string") return error;
  const value = error as { code?: string; message?: string };
  if (value.code === "functions/not-found" || value.code === "functions/unavailable") return "DevKitty could not connect. Please try again shortly, bunny.";
  if (value.code === "functions/unauthenticated") return "Please sign in again to use your workspace, bunny.";
  if (value.code === "functions/deadline-exceeded") return "That answer took too long. Please try a shorter question, bunny.";
  if (value.code?.startsWith("functions/") && value.message && !/^internal$/i.test(value.message)) return value.message;
  if (value.message && !/^internal$/i.test(value.message)) return value.message;
  return "DevKitty could not complete that request. Please try again, bunny.";
}

