import { auth } from "@/lib/firebase";

/** Called by the admin Task Manager's future Connect Calendar button. Never send credentials to Google from the browser. */
export async function connectAdminGoogleCalendar(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in as administrator to connect Google Calendar.");
  const response = await fetch("/api/admin/calendar/authorize", {
    method: "POST", credentials: "same-origin",
    headers: { Authorization: `Bearer ${await user.getIdToken()}`, "Content-Type": "application/json" },
    body: "{}",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "calendar_service_unavailable");
  const url = new URL(result.authorizationUrl);
  if (url.origin !== "https://accounts.google.com" || url.pathname !== "/o/oauth2/v2/auth") throw new Error("Invalid Google authorization address.");
  window.location.assign(url.href);
}
