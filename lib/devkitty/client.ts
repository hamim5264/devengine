import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import type { DevKittyBootstrap, DevKittyMessage, DevKittyAnswer, DevKittyAdminState, DevKittyModel, DevKittyInsights } from "@/types/devkitty";
function callable<Request, Response>(name: string) { return httpsCallable<Request, Response>(getFunctions(app, "us-central1"), name, { timeout: 125000 }); }
export async function bootstrapDevKitty() { return (await callable<Record<string, never>, DevKittyBootstrap>("devkittyBootstrap")({})).data; }
export async function sendDevKittyMessage(messages: DevKittyMessage[]) {
  const history = messages.filter(message => !message.greeting).slice(-16).map(({ role, content }) => ({ role, content }));
  while (history.length > 1 && history.reduce((total, item) => total + item.content.length, 0) > 28000) history.shift();
  return (await callable<{ messages: typeof history }, DevKittyAnswer>("devkittyChat")({ messages: history })).data;
}
export async function readDevKittyAdmin() { return (await callable<{ action: string }, DevKittyAdminState>("devkittyAdmin")({ action: "read" })).data; }
export async function readDevKittyInsights() { return (await callable<{ action: string }, DevKittyInsights>("devkittyAdmin")({ action: "insights" })).data; }
export async function devKittyAdminAction(data: Record<string, unknown>) { return (await callable<Record<string, unknown>, Record<string, unknown>>("devkittyAdmin")(data)).data; }
export async function getDevKittyModels() { return (await callable<{ action: string }, { models: DevKittyModel[] }>("devkittyAdmin")({ action: "models" })).data.models; }
export function devKittyError(error: unknown) {
  const value = error as { code?: string; message?: string };
  if (value.code === "functions/not-found" || value.code === "functions/unavailable") return "DevKitty could not connect. Please try again shortly, bunny.";
  if (value.code === "functions/unauthenticated") return "Please sign in again to use your workspace, bunny.";
  if (value.code === "functions/deadline-exceeded") return "That answer took too long. Please try a shorter question, bunny.";
  if (value.code?.startsWith("functions/") && value.message && !/^internal$/i.test(value.message)) return value.message;
  return "DevKitty could not complete that request. Please try again, bunny.";
}
