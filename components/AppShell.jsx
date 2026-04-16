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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    company: "",
    newPassword: "",
    confirmPassword: "",
  });
  const userMenuRef = useRef(null);
  const showTopHeader = pathname === "/dashboard";

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
  const expandSidebarOnHover = () => {
    setSidebarMode((prev) => (prev === "collapsed" ? "expanded" : prev));
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
        onHoverExpand={expandSidebarOnHover}
        isAdmin={!!sessionUser?.is_admin}
        currentUser={sessionUser}
      />
      <div className={`max-w-full min-w-0 overflow-x-hidden transition-all ${sidebarWidthClass}`}>
        {showTopHeader ? (
          <header className="border-b border-slate-200 bg-white px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
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
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen((prev) => !prev)}
                    className="rounded-full border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                    aria-label="Open profile menu"
                  >
                    <CircleUserRound className="h-5 w-5" />
                  </button>
                  {isUserMenuOpen ? (
                    <div className="absolute right-0 top-11 z-20 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                      <button
                        onClick={openProfileModal}
                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                      >
                        Edit Profile
                      </button>
                      <button
                        onClick={logout}
                        className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      >
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>
        ) : null}
        <div className={`${showTopHeader ? "min-h-[calc(100vh-57px)]" : "min-h-screen"} max-w-full min-w-0 overflow-x-hidden`}>
          {children}
        </div>
      </div>
      {isProfileModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Edit Profile</h2>
                <p className="text-sm text-slate-500">Update your details and reset your password if needed.</p>
              </div>
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

