import type { NextApiRequest, NextApiResponse } from "next";
import { getServerFirebase } from "@/lib/server/admin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { type, email, details } = req.body || {};
    const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "Unknown";

    const { db } = getServerFirebase();

    // Check if IP is already in blocked list
    const safeIpId = ip.replace(/[^a-zA-Z0-9_.-]/g, "_");
    const blockedCheck = await db.collection("blocked_ips").doc(safeIpId).get();
    if (blockedCheck.exists) {
      return res.status(403).json({ error: "Access denied by security firewall.", blocked: true });
    }

    // Record security log entry
    if (type === "failed_login") {
      await db.collection("security_logs").add({
        type: "failed_login",
        title: `Failed Authentication Attempt: ${email || "Unknown user"}`,
        description: `Failed login attempt from IP ${ip}. User-Agent: ${userAgent.slice(0, 120)}. ${details || ""}`.trim(),
        severity: "warning",
        actionTaken: "flagged",
        ip,
        userAgent: userAgent.slice(0, 160),
        email: email || "unknown",
        timestamp: new Date().toISOString(),
      });
    } else if (type === "probe_scan") {
      await db.collection("security_logs").add({
        type: "probe_scan",
        title: `Malicious Probing Request Intercepted`,
        description: `Client attempted to probe sensitive path: ${details || "unknown"}. IP: ${ip}`,
        severity: "high",
        actionTaken: "blocked",
        ip,
        userAgent: userAgent.slice(0, 160),
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({ recorded: true });
  } catch (err: any) {
    // Fail silently so security reporting never disrupts client flow
    return res.status(200).json({ recorded: false });
  }
}

