"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = String(params?.id || "");
  const editRequested = searchParams.get("edit") === "1";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [user, setUser] = useState(null);
  const [sessionUser, setSessionUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", role: "User", status: "Active", password: "" });
  const canSelfEdit = !!sessionUser?.id && String(sessionUser.id) === String(userId);
  const canManageUser = !!sessionUser?.is_admin;
  const canEditProfile = canManageUser || canSelfEdit;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (!sessionRes.ok || !sessionData?.user) return;
        setSessionUser(sessionData.user);

        const res = await fetch(`/api/users/${userId}`);
        const data = await res.json();
        if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load user.");
        setUser(data.user || null);
        setForm({
          name: data.user?.name || "",
          email: data.user?.email || "",
          role: data.user?.is_admin ? "Admin" : "User",
          status: data.user?.status || "Active",
          password: "",
        });
      } catch (e) {
        setError(e?.message || "Failed to load user.");
      } finally {
        setLoading(false);
      }
    };
    if (userId) load();
  }, [router, userId]);

  useEffect(() => {
    if (!loading && user && editRequested && canEditProfile) {
      setEditing(true);
    }
  }, [loading, user, editRequested, canEditProfile]);

  const onSave = async () => {
    setError("");
    setSuccess("");
    try {
      const payload = canManageUser
        ? form
        : {
            name: form.name,
            email: form.email,
            password: form.password,
          };
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to update user.");
      setUser(data.user);
      setEditing(false);
      setSuccess("User updated.");
    } catch (e) {
      setError(e?.message || "Failed to update user.");
    }
  };

  const onDelete = async () => {
    const ok = window.confirm(`Delete user "${user?.name}"?`);
    if (!ok) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to delete user.");
      router.push("/users");
    } catch (e) {
      setError(e?.message || "Failed to delete user.");
    }
  };

  const switchAsUser = async () => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to login as user.");
      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e?.message || "Failed to login as user.");
    }
  };

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">User Details</h1>
          {sessionUser?.is_admin ? (
            <button
              onClick={() => router.push("/users")}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Back to Users
            </button>
          ) : null}
        </div>

        {loading ? <p className="mt-4 text-sm text-slate-500">Loading...</p> : null}
        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        {!loading && user ? (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</p>
                  {editing ? (
                    <input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-slate-900">{user.name}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
                  {editing ? (
                    <input
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">{user.email}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
                  {editing && canManageUser ? (
                    <select
                      value={form.role}
                      onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="User">User</option>
                      <option value="Admin">Admin</option>
                    </select>
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">{user.is_admin ? "Admin" : "User"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</p>
                  {editing && canManageUser ? (
                    <select
                      value={form.status}
                      onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  ) : (
                    <p className="mt-1 text-sm text-slate-900">{user.status || "Active"}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Created Date</p>
                  <p className="mt-1 text-sm text-slate-900">{new Date(user.created_at).toLocaleString()}</p>
                </div>
                {editing ? (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">New Password</p>
                    <input
                      type="password"
                      minLength={8}
                      value={form.password}
                      onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                ) : null}
              </div>
              {canEditProfile ? (
                <div className="flex flex-wrap gap-2">
                  {editing ? (
                    <>
                      <button
                        onClick={onSave}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditing(false)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setEditing(true)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        Edit
                      </button>
                      {canManageUser ? (
                        <>
                          <button
                            onClick={onDelete}
                            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700"
                          >
                            Delete
                          </button>
                          <button
                            onClick={switchAsUser}
                            disabled={user.is_admin}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                          >
                            Login As User
                          </button>
                        </>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Activity / Assigned Tasks</p>
              <p className="mt-2 text-sm text-slate-500">
                Future-ready panel: user activity logs and assigned tasks can be shown here.
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
