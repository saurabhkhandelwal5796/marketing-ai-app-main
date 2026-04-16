"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname === "/auth";

  const [sidebarMode, setSidebarMode] = useState("expanded"); // expanded | collapsed
  const [sessionUser, setSessionUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("aiMarketing.sidebarMode");
      if (saved === "expanded" || saved === "collapsed") {
        setSidebarMode(saved);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("aiMarketing.sidebarMode", sidebarMode);
    } catch (_) {
      // ignore
    }
  }, [sidebarMode]);

  useEffect(() => {
    let mounted = true;
    const loadSession = async () => {
      setLoadingSession(true);
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (!mounted) return;
        setSessionUser(data?.user || null);
      } catch {
        if (!mounted) return;
        setSessionUser(null);
      } finally {
        if (mounted) setLoadingSession(false);
      }
    };
    loadSession();
    return () => {
      mounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (loadingSession) return;
    if (!sessionUser && !isAuthRoute) {
      router.replace("/auth");
      return;
    }
    if (sessionUser && isAuthRoute) {
      router.replace("/dashboard");
    }
  }, [isAuthRoute, loadingSession, router, sessionUser]);

  const cycleCollapsed = () => {
    setSidebarMode((prev) => (prev === "expanded" ? "collapsed" : "expanded"));
  };

  const sidebarWidthClass = sidebarMode === "collapsed" ? "pl-[78px]" : "pl-64";
  const isImpersonating = !!sessionUser?.admin_id;

  const restoreAdmin = async () => {
    const res = await fetch("/api/auth/restore", { method: "POST" });
    if (!res.ok) return;
    const data = await fetch("/api/auth/session").then((r) => r.json());
    setSessionUser(data?.user || null);
    router.refresh();
  };

  if (loadingSession) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading...</div>;
  }

  if (isAuthRoute) return <>{children}</>;

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-50">
      <Sidebar
        mode={sidebarMode}
        onToggleCollapsed={cycleCollapsed}
        isAdmin={!!sessionUser?.is_admin}
        currentUser={sessionUser}
      />
      <div className={`max-w-full min-w-0 overflow-x-hidden transition-all ${sidebarWidthClass}`}>
        {isImpersonating ? (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-amber-900">
                Viewing as <span className="font-semibold">{sessionUser?.name || "User"}</span>
              </p>
              <button
                onClick={restoreAdmin}
                className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
              >
                Return to Admin
              </button>
            </div>
          </div>
        ) : null}
        <div className="min-h-screen max-w-full min-w-0 overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}

