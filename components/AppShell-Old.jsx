"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { getAuditSessionDurationMs, trackLogout } from "../lib/auditTracker";
import Avatar from "./Avatar";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthRoute = pathname === "/auth";
  const isPublicRoute = pathname === "/auth";

  const [sidebarMode, setSidebarMode] = useState("expanded"); // expanded | collapsed
  const [sessionUser, setSessionUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
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
    if (!sessionUser?.is_admin) return;
    try {
      const key = "auditTrail.lastCleanupAt";
      const last = Number(window.localStorage.getItem(key) || "0");
      const day = 24 * 60 * 60 * 1000;
      if (last && Date.now() - last < day) return;
      window.localStorage.setItem(key, String(Date.now()));
      fetch("/api/audit/cleanup", { method: "POST" }).catch(() => {});
    } catch {
      // ignore
    }
  }, [loadingSession, sessionUser?.is_admin]);

  useEffect(() => {
    if (loadingSession) return;
    const shouldRedirectToAuth = !sessionUser && !isAuthRoute;
    if (shouldRedirectToAuth) {
      router.replace("/auth");
      return;
    }
    if (sessionUser && isAuthRoute) {
      router.replace("/dashboard");
    }
  }, [isAuthRoute, isPublicRoute, loadingSession, router, sessionUser]);

  const cycleCollapsed = () => {
    setSidebarMode((prev) => (prev === "expanded" ? "collapsed" : "expanded"));
  };
  const expandSidebarOnHover = () => {
    setSidebarMode((prev) => (prev === "collapsed" ? "expanded" : prev));
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
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error", err);
    }
    setSessionUser(null);
    window.location.href = "/auth";
  };

  const openProfileModal = async () => {
    setProfileError("");
    setProfileSuccess("");
    setProfileSubmitting(false);

    // Pre-fill synchronously using session data so there is no blank flash
    const nameParts = (sessionUser?.name || "").split(/\s+/).filter(Boolean);
    const fallbackFirst = nameParts[0] || "";
    const fallbackLast = nameParts.slice(1).join(" ") || "";

    setProfileForm({
      firstName: fallbackFirst,
      lastName: fallbackLast,
      email: sessionUser?.email || "",
      company: sessionUser?.company || "",
      newPassword: "",
      confirmPassword: "",
    });
    setIsProfileModalOpen(true);

    try {
      const res = await fetch("/api/auth/profile");
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load profile.");
      setProfileForm(prev => ({
        ...prev,
        firstName: data?.user?.firstName || prev.firstName,
        lastName: data?.user?.lastName || prev.lastName,
        email: data?.user?.email || prev.email,
        company: data?.user?.company || prev.company,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load profile.";
      setProfileError(message);
    }
  };

  const closeProfileModal = () => {
    if (profileSubmitting) return;
    setIsProfileModalOpen(false);
    setProfileError("");
    setProfileSuccess("");
  };

  const onProfileSubmit = async (event) => {
    event.preventDefault();
    setProfileSubmitting(true);
    setProfileError("");
    setProfileSuccess("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to update profile.");
      setSessionUser((prev) => ({
        ...prev,
        name: data?.user?.name || prev?.name,
        email: data?.user?.email || prev?.email,
        company: data?.user?.company || prev?.company,
      }));
      setProfileForm((prev) => ({ ...prev, newPassword: "", confirmPassword: "" }));
      setProfileSuccess("Profile updated successfully.");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update profile.";
      setProfileError(message);
    } finally {
      setProfileSubmitting(false);
    }
  };

  if (loadingSession) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">Loading...</div>;
  }

  if (isPublicRoute) return <>{children}</>;

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 flex">
      {/* Static Sidebar - never re-renders */}
      <Sidebar
        mode={sidebarMode}
        onToggleCollapsed={cycleCollapsed}
        onHoverExpand={expandSidebarOnHover}
        isAdmin={!!sessionUser?.is_admin}
        currentUser={sessionUser}
        onOpenProfileModal={openProfileModal}
        onLogout={logout}
      />
      
      {/* Dynamic Content Area - can re-render independently */}
      <NavigationProvider>
        <div className={`max-w-full min-w-0 overflow-x-hidden transition-all print:pl-0 ${sidebarWidthClass}`}>
          {(() => {
            if (!sessionUser) return null;
            const isImpersonating = !!sessionUser.admin_id;
            const isNormalAdmin = !isImpersonating && !!sessionUser.is_admin;
            const isNormalUser = !isImpersonating && !sessionUser.is_admin;

            // CASE 1: Normal user -> Remove completely
            if (isNormalUser) return null;

            // CASE 3: Admin impersonation -> Show a top banner/header on all pages
            if (isImpersonating) {
              return (
                <header className="border-b border-indigo-200 bg-indigo-50 px-5 py-3 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></div>
                      <p className="text-sm font-bold text-indigo-900">
                        Logged in as {sessionUser.name || "User"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={restoreAdmin}
                        className="rounded-lg border border-indigo-200 bg-white px-4 py-1.5 text-xs font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-100 hover:scale-[0.98]"
                      >
                        Return to Admin
                      </button>
                    </div>
                  </div>
                </header>
              );
            }

            // CASE 2: Normal Admin -> KEEP existing functionality EXACTLY the same
            if (isNormalAdmin && showTopHeader) {
              return (
                <header className="border-b border-slate-200 bg-white px-5 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{sessionUser.name || "User"}</p>
                      <p className="text-xs text-slate-500">Admin</p>
                    </div>
                  </div>
                </header>
              );
            }

            return null;
          })()}

          {(() => {
            const isImpersonating = !!sessionUser?.admin_id;
            const isNormalAdmin = !isImpersonating && !!sessionUser.is_admin;
            const headerIsRendered = isImpersonating || (isNormalAdmin && showTopHeader);
            
            return (
              <div className={`${headerIsRendered ? "min-h-[calc(100vh-57px)]" : "min-h-screen"} max-w-full min-w-0 overflow-x-hidden`}>
                {children}
                <LoadingOverlay />
              </div>
            );
          })()}
        </div>
        
        {/* Profile Modal - outside NavigationProvider to prevent re-renders */}
        {isProfileModalOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Edit Profile</h2>
                  <p className="text-sm text-slate-500">Update your details and reset your password if needed.</p>
                </div>
                <button
                  onClick={closeProfileModal}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>

              {profileError ? (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{profileError}</div>
              ) : null}
              {profileSuccess ? (
                <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {profileSuccess}
                </div>
              ) : null}

              <form onSubmit={onProfileSubmit} className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    First Name
                    <input
                      required
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Last Name
                    <input
                      required
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </label>
                </div>
                <label className="block text-sm font-medium text-slate-700">
                  Email
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Company
                  <input
                    required
                    value={profileForm.company}
                    onChange={(e) => setProfileForm((prev) => ({ ...prev, company: e.target.value }))}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Optional password reset</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-700">
                      New Password
                      <input
                        type="password"
                        minLength={8}
                        value={profileForm.newPassword}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Confirm Password
                      <input
                        type="password"
                        minLength={8}
                        value={profileForm.confirmPassword}
                        onChange={(e) => setProfileForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSubmitting}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {profileSubmitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </NavigationProvider>
    </div>
  );
}


