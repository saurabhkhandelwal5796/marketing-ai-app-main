"use client";

import { useEffect, useRef, useState } from "react";
import { trackPageLeave } from "./auditTracker";

/** Loads current user id from session cookie API. */
export function useAuditSessionUserId() {
  const [userId, setUserId] = useState(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (mounted) setUserId(data?.user?.id || null);
      } catch {
        if (mounted) setUserId(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);
  return userId;
}

/**
 * On mount / when pageName changes: track enter; on unmount or before next page: track leave with duration.
 */
export function useAuditPageVisit(userId, pageName) {
  const enteredAtRef = useRef(null);
  const pageRef = useRef(pageName);

  useEffect(() => {
    if (!userId || !pageName) return undefined;

    const leave = (name, startedAt) => {
      if (startedAt != null && name) {
        trackPageLeave(userId, name, Date.now() - startedAt);
      }
    };

    leave(pageRef.current, enteredAtRef.current);
    pageRef.current = pageName;
    enteredAtRef.current = Date.now();

    return () => {
      leave(pageRef.current, enteredAtRef.current);
      enteredAtRef.current = null;
    };
  }, [userId, pageName]);
}

/** Convenience: fetch user + track single page name. */
export function useAuditUserAndPage(pageName) {
  const userId = useAuditSessionUserId();
  useAuditPageVisit(userId, pageName);
  return userId;
}
