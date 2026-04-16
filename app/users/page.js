"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserPlus } from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [sessionUser, setSessionUser] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "User",
    status: "Active",
  });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  const load = async (overrides = {}) => {
    const params = new URLSearchParams({
      search: overrides.search ?? search,
      role: overrides.role ?? roleFilter,
      status: overrides.status ?? statusFilter,
      page: String(overrides.page ?? page),
      pageSize: String(pageSize),
    });
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load users.");
      setUsers(Array.isArray(data.users) ? data.users : []);
      setPagination(data.pagination || { page: 1, pageSize, total: 0 });
    } catch (e) {
      setError(e?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (!res.ok || !data?.user) return;
        setSessionUser(data.user);
        if (!data.user.is_admin) {
          router.replace("/campaigns");
          return;
        }
        load({ page: 1 });
      } catch {
        setError("Failed to initialize users.");
      }
    };
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionUser?.is_admin) return;
    load({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const openCreateForm = () => {
    setEditingUser(null);
    setForm({ name: "", email: "", password: "", role: "User", status: "Active" });
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.is_admin ? "Admin" : "User",
      status: user.status || "Active",
    });
    setShowForm(true);
  };

  const switchAsUser = async (u) => {
    if (!u?.id) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to login as user.");
      router.replace("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e?.message || "Failed to login as user.");
    }
  };

  const onOpenUser = (u) => {
    if (!u?.id) return;
    router.push(`/users/${u.id}`);
  };

  const onSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const payload = { ...form };
      const res = editingUser
        ? await fetch(`/api/users/${editingUser.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to save user.");
      setSuccess(editingUser ? "User updated." : "User created.");
      setShowForm(false);
      setEditingUser(null);
      load({ page: 1 });
      setPage(1);
    } catch (e2) {
      setError(e2?.message || "Failed to save user.");
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
      load({ page });
    } catch (e) {
      setError(e?.message || "Failed to delete user.");
    }
  };

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pageSize));

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">User Management</h1>
            <p className="mt-1 text-sm text-slate-200">Manage users, permissions, and impersonation from one place.</p>
          </div>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            <UserPlus size={16} />
            Add User
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">All Users</h2>
            <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name/email"
              className="min-w-[220px] rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="User">User</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <button
              onClick={() => {
                setPage(1);
                load({ page: 1, search, role: roleFilter, status: statusFilter });
              }}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Apply
            </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-sm text-slate-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">Name</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">Email</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">Role</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700">Created</th>
                  <th className="px-5 py-3 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-5 py-3">
                    <button onClick={() => onOpenUser(u)} className="font-semibold text-blue-700 hover:underline">
                      {u.name}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-700">{u.email}</td>
                  <td className="px-5 py-3 text-slate-700">{u.is_admin ? "Admin" : "User"}</td>
                  <td className="px-5 py-3 text-slate-700">{u.status || "Active"}</td>
                  <td className="px-5 py-3 text-slate-700">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditForm(u)}
                        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                        title="Edit user"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => switchAsUser(u)}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        title="Login as user"
                        disabled={u.is_admin}
                      >
                        Login as
                      </button>
                      <button
                        onClick={() => onDelete(u)}
                        className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                        title="Remove user"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
                ))}
                {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No users yet. Add your first user above.
                  </td>
                </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
          <p className="text-sm text-slate-600">
            Showing page {pagination.page} of {totalPages} ({pagination.total} users)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <form onSubmit={onSave} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">{editingUser ? "Edit User" : "Create User"}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-slate-500">
                Close
              </button>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Full Name
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Password {editingUser ? "(optional for update)" : ""}
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required={!editingUser}
                minLength={8}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-700">
                Role
                <select
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="User">User</option>
                  <option value="Admin">Admin</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingUser ? "Update User" : "Create User"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}

