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

  const restoreAdmin = async () => {
    const res = await fetch("/api/auth/restore", { method: "POST" });
    if (!res.ok) return;
    const data = await fetch("/api/auth/session").then((r) => r.json());
    setSessionUser(data?.user || null);
    router.refresh();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSessionUser(null);
    router.replace("/auth");
    router.refresh();
  };

  if (loadingSession) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading...</div>;
  }

  if (isAuthRoute) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        mode={sidebarMode}
        onToggleCollapsed={cycleCollapsed}
        isAdmin={!!sessionUser?.is_admin}
      />
      <div className={`transition-all ${sidebarWidthClass}`}>
        <header className="border-b border-slate-200 bg-white px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{sessionUser?.name || "User"}</p>
              <p className="text-xs text-slate-500">
                {sessionUser?.admin_id ? `Logged in as ${sessionUser?.name || "User"}` : sessionUser?.is_admin ? "Admin" : "User"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {sessionUser?.admin_id ? (
                <button
                  onClick={restoreAdmin}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Return to Admin
                </button>
              ) : null}
              <button
                onClick={logout}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <div className="min-h-[calc(100vh-57px)]">{children}</div>
      </div>
    </div>
  );
}

