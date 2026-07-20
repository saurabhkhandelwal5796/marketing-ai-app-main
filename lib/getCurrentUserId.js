"use client";

let cachedUserId = null;
let inFlight = null;

export async function getCurrentUserId() {
  if (cachedUserId) return cachedUserId;
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json().catch(() => ({}));
      const id = String(data?.user?.id || "").trim();
      cachedUserId = id || "anonymous";
      return cachedUserId;
    } catch {
      cachedUserId = "anonymous";
      return cachedUserId;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function getCurrentSessionId() {
  try {
    return localStorage.getItem("session_id") || localStorage.getItem("marketing_audit_session_id") || "";
  } catch {
    return "";
  }
}

