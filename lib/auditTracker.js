/**
 * Client-side audit logging.
 *
 * Protections:
 * - Page visits: only log when time_spent_ms >= 10s.
 * - Debounce page visits: same user+page within 30s logs once.
 *
 * NOTE: Actions are intentionally NOT batched. They are sent immediately.
 */

const SESSION_ID_KEY = "marketing_audit_session_id";
const SESSION_STARTED_KEY = "marketing_audit_session_started_at";

const MIN_PAGE_VISIT_MS = 10_000;
const PAGE_DEDUPE_WINDOW_MS = 30_000;

/** @type {Map<string, number>} */
const lastPageVisitLoggedAt = new Map(); // `${userId}::${pageName}` -> ms epoch

function safeNowIso() {
  return new Date().toISOString();
}

function getOrCreateSessionId() {
  if (typeof window === "undefined") return "";
  try {
    let id = window.localStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(SESSION_ID_KEY, id);
      window.localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
    }
    return id;
  } catch {
    return "";
  }
}

/** Call after successful login — new session id and timer. */
export function ensureAuditSessionAtLogin() {
  if (typeof window === "undefined") return "";
  try {
    const id = crypto.randomUUID();
    window.localStorage.setItem(SESSION_ID_KEY, id);
    window.localStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
    return id;
  } catch {
    return "";
  }
}

export function getAuditSessionId() {
  return getOrCreateSessionId();
}

export function getAuditSessionDurationMs() {
  if (typeof window === "undefined") return null;
  try {
    const t = window.localStorage.getItem(SESSION_STARTED_KEY);
    if (!t) return null;
    return Math.max(0, Date.now() - Number(t));
  } catch {
    return null;
  }
}

export function clearAuditSessionStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_ID_KEY);
    window.localStorage.removeItem(SESSION_STARTED_KEY);
  } catch {
    // ignore
  }
}

function parseDetails(details) {
  if (details == null) return { page_name: "", detailsStr: null };
  if (typeof details === "string") return { page_name: "", detailsStr: details };
  if (typeof details === "object") {
    const page_name = String(details.page_name || details.page || "");
    const { page_name: _p, page: _q, ...rest } = details;
    const keys = Object.keys(rest);
    return {
      page_name,
      detailsStr: keys.length ? JSON.stringify(rest) : null,
    };
  }
  return { page_name: "", detailsStr: String(details) };
}

async function postAudit(body) {
  try {
    // Debug visibility (requested): log the userId before sending.
    // eslint-disable-next-line no-console
    console.log("[audit] sending", { userId: body?.user_id, event: body });

    const res = await fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.error) {
      // eslint-disable-next-line no-console
      console.error("[audit] failed", { status: res.status, data });
    }
    return { ok: res.ok && !data?.error, data };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[audit] network error", e);
    return { ok: false, error: e };
  }
}

function shouldDebouncePageVisit(userId, pageName) {
  const key = `${userId}::${pageName}`;
  const now = Date.now();
  const prev = lastPageVisitLoggedAt.get(key) || 0;
  if (now - prev < PAGE_DEDUPE_WINDOW_MS) return true;
  lastPageVisitLoggedAt.set(key, now);
  return false;
}

/**
 * @param {string} userId
 * @param {string} eventType
 * @param {string | Record<string, unknown> | null} details
 */
export function trackEvent(userId, eventType, details) {
  if (!userId || !eventType) return Promise.resolve();
  const { page_name, detailsStr } = parseDetails(details);
  return postAudit({
    user_id: userId,
    event_type: eventType,
    page_name: page_name || "",
    action_name: null,
    details: detailsStr,
    time_spent_ms: null,
    created_at: safeNowIso(),
    session_id: getAuditSessionId(),
  });
}

/**
 * Kept for compatibility; we intentionally don't POST on enter anymore.
 * The meaningful row is written on leave when duration >= 10s.
 */
export function trackPageEnter() {
  return Promise.resolve();
}

export function trackPageLeave(userId, pageName, timeSpentMs) {
  if (!userId || !pageName) return Promise.resolve();
  const ms = Number(timeSpentMs);
  if (!Number.isFinite(ms) || ms < MIN_PAGE_VISIT_MS) return Promise.resolve();
  if (shouldDebouncePageVisit(userId, pageName)) return Promise.resolve();
  return postAudit({
    user_id: userId,
    event_type: "page_visit",
    page_name: pageName,
    action_name: null,
    details: null,
    time_spent_ms: Math.round(ms),
    created_at: safeNowIso(),
    session_id: getAuditSessionId(),
  });
}

export function trackAction(userId, actionName, pageName, details) {
  if (!userId || !actionName || !pageName) return Promise.resolve();
  return postAudit({
    user_id: userId,
    event_type: "action",
    page_name: pageName,
    action_name: actionName,
    details: details == null ? null : typeof details === "string" ? details : JSON.stringify(details),
    time_spent_ms: null,
    created_at: safeNowIso(),
    session_id: getAuditSessionId(),
  });
}

/** Logout: total session duration on the row; then clear session storage. */
export function trackLogout(userId, sessionDurationMs) {
  if (!userId) {
    clearAuditSessionStorage();
    return Promise.resolve();
  }
  const ms = sessionDurationMs != null ? Math.round(Number(sessionDurationMs)) : null;
  return postAudit({
    user_id: userId,
    event_type: "logout",
    page_name: "App",
    action_name: null,
    details: null,
    time_spent_ms: Number.isFinite(ms) ? ms : null,
    created_at: safeNowIso(),
    session_id: getAuditSessionId(),
  }).finally(() => clearAuditSessionStorage());
}
