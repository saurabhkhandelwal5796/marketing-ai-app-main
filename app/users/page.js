"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";

const ROLES = [
  "Marketing Executive",
  "Content Writer",
  "Social Media Manager",
  "SEO Analyst",
  "Campaign Manager",
  "Sales Coordinator",
];

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "";
  return (first + last).toUpperCase();
}

export default function UsersPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES[0]);

  const avatar = useMemo(() => initials(name), [name]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load users.");
      setUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setError(e?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, role }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to create user.");
      setSuccess("User created.");
      setName("");
      setEmail("");
      setRole(ROLES[0]);
      setUsers((prev) => [data.user, ...prev]);
    } catch (e2) {
      setError(e2?.message || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (u) => {
    if (!u?.id) return;
    const ok = window.confirm(`Delete user "${u.name}"?`);
    if (!ok) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to delete user.");
      setSuccess("User deleted.");
      setUsers((prev) => prev.filter((x) => x.id !== u.id));
    } catch (e) {
      setError(e?.message || "Failed to delete user.");
    }
  };

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">Users</h1>
        <p className="mt-1 text-sm text-slate-500">Create and manage team members for task assignment.</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <form onSubmit={onAdd} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <label className="block text-sm font-medium text-slate-700 md:col-span-1">
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 md:col-span-1">
            Email
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700 md:col-span-1">
            Role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-3 md:col-span-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
              {avatar || "?"}
            </div>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !email.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <UserPlus size={16} />
              {submitting ? "Adding..." : "Add User"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">All Users</h2>
          <button
            onClick={load}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-500">Loading...</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {users.map((u) => (
              <article key={u.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                      {u.avatar || initials(u.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{u.name}</p>
                      <p className="truncate text-sm text-slate-600">{u.email}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-700">{u.role || "—"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(u)}
                    className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                    title="Remove user"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
            {users.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No users yet. Add your first user above.
              </div>
            ) : null}
          </div>
        )}
      </section>
    </main>
  );
}

