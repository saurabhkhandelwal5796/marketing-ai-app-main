"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, UserPlus, Search, MoreHorizontal, Users } from "lucide-react";
import { getCurrentSessionId, getCurrentUserId } from "../../lib/getCurrentUserId";

function buildUserEditDetails(originalUser, nextForm) {
  if (!originalUser) return "User details updated.";
  const updates = [];
  const nextName = String(nextForm?.name || "").trim();
  const nextEmail = String(nextForm?.email || "").trim();
  const nextIsAdmin = String(nextForm?.role || "User") === "Admin";
  const nextStatus = String(nextForm?.status || "Active");
  const passwordChanged = String(nextForm?.password || "").trim().length > 0;

  if (nextName && nextName !== String(originalUser?.name || "").trim()) {
    updates.push(`name "${originalUser?.name || "-"}" -> "${nextName}"`);
  }
  if (nextEmail && nextEmail !== String(originalUser?.email || "").trim()) {
    updates.push(`email "${originalUser?.email || "-"}" -> "${nextEmail}"`);
  }
  if (nextIsAdmin !== !!originalUser?.is_admin) {
    updates.push(`role ${originalUser?.is_admin ? "Admin" : "User"} -> ${nextIsAdmin ? "Admin" : "User"}`);
  }
  if (nextStatus !== String(originalUser?.status || "Active")) {
    updates.push(`status ${String(originalUser?.status || "Active")} -> ${nextStatus}`);
  }
  if (passwordChanged) updates.push("password updated");

  return updates.length ? `Updated user fields: ${updates.join(", ")}` : "Opened user edit and saved without field changes.";
}

export default function UsersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [sessionUser, setSessionUser] = useState(null);
  const [toast, setToast] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestsError, setRequestsError] = useState("");
  const [pendingUsers, setPendingUsers] = useState([]);
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

  const [openDropdownId, setOpenDropdownId] = useState(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const handleClickOutside = () => setOpenDropdownId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleDropdown = (e, id) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
    setOpenDropdownId((prev) => (prev === id ? null : id));
  };

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

  const loadPendingRequests = async () => {
    setRequestsLoading(true);
    setRequestsError("");
    try {
      const params = new URLSearchParams({ status: "Pending", page: "1", pageSize: "100" });
      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load pending requests.");
      setPendingUsers(Array.isArray(data.users) ? data.users : []);
    } catch (e) {
      setRequestsError(e?.message || "Failed to load pending requests.");
      setPendingUsers([]);
    } finally {
      setRequestsLoading(false);
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
    const startTime = Date.now();
    return () => {
      const timeSpent = Date.now() - startTime;
      if (timeSpent > 10000) {
        (async () => {
          const currentUserId = await getCurrentUserId();
          fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: currentUserId || "anonymous",
              event_type: "page_visit",
              page_name: "Users",
              time_spent_ms: timeSpent,
              details: `Spent ${Math.round(timeSpent / 1000)} seconds on Users page`,
              session_id: getCurrentSessionId(),
            }),
          }).catch(() => {});
        })();
      }
    };
  }, []);

  useEffect(() => {
    if (!sessionUser?.is_admin) return;
    load({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const openCreateForm = () => {
    setEditingUser(null);
    setIsViewMode(false);
    setForm({ name: "", email: "", password: "", role: "User", status: "Active" });
    setShowForm(true);
  };

  const openEditForm = (user) => {
    setEditingUser(user);
    setIsViewMode(false);
    setForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.is_admin ? "Admin" : "User",
      status: user.status || "Active",
    });
    setShowForm(true);
  };

  const openViewForm = (user) => {
    setEditingUser(user);
    setIsViewMode(true);
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

  const updateUserStatus = async (u, newStatus) => {
    setUsers((prev) => prev.map((user) => (user.id === u.id ? { ...user, status: newStatus } : user)));
    try {
      const res = await fetch(`/api/users/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to update status.");
    } catch (e) {
      setUsers((prev) => prev.map((user) => (user.id === u.id ? { ...user, status: u.status } : user)));
      setError(e?.message || "Failed to update status.");
    }
  };

  const approvePending = async (u) => {
    const ok = window.confirm(`Approve "${u.name}"?`);
    if (!ok) return;
    await updateUserStatus(u, "Active");
    setPendingUsers((prev) => prev.filter((x) => x.id !== u.id));
    setToast("User approved successfully");
  };

  const rejectPending = async (u) => {
    const ok = window.confirm(`Reject "${u.name}"?`);
    if (!ok) return;
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to reject user.");
      setPendingUsers((prev) => prev.filter((x) => x.id !== u.id));
      setToast("User rejected successfully");
    } catch (e) {
      setError(e?.message || "Failed to reject user.");
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
      const originalUser = editingUser
        ? {
            name: editingUser.name || "",
            email: editingUser.email || "",
            is_admin: !!editingUser.is_admin,
            status: editingUser.status || "Active",
          }
        : null;
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
      const currentUserId = await getCurrentUserId();
      const actionName = editingUser ? "Edited User" : "Created New User";
      const details = editingUser
        ? buildUserEditDetails(originalUser, payload)
        : `Created user ${String(form.name || "").trim()} (${String(form.email || "").trim()}) with role ${String(form.role || "User")} and status ${String(form.status || "Active")}`;
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "Users",
          action_name: actionName,
          details,
          session_id: getCurrentSessionId(),
        }),
      }).catch(() => {});
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
    const ok = window.confirm(`Are you sure you want to delete user "${u.name}"?`);
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
      {toast ? (
        <div className="fixed right-4 top-4 z-[200] w-[min(420px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium leading-snug">{toast}</p>
            <button
              type="button"
              onClick={() => setToast("")}
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
      {/* HEADER */}
      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">User Management</h1>
            <p className="mt-1 text-xs font-medium text-slate-500">Manage users, permissions, and impersonation efficiently.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                setShowRequests(true);
                await loadPendingRequests();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
            >
              <Users size={16} />
              User Requests
            </button>
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[0.98] hover:bg-indigo-700"
            >
              <UserPlus size={16} />
              Add User
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 shadow-sm">{success}</div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        
        {/* FILTER BAR */}
        <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 bg-slate-50/50 px-5 py-4">
          <div className="relative min-w-[280px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="User">User</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
            </select>
            <button
              onClick={() => {
                setPage(1);
                load({ page: 1, search, role: roleFilter, status: statusFilter });
              }}
              className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800"
            >
              Apply
            </button>
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm font-medium text-slate-500">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Users size={32} />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No users found</h3>
            <p className="mt-1 text-sm text-slate-500">We couldn&apos;t find any users matching your criteria.</p>
            <button
              onClick={openCreateForm}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700"
            >
              <UserPlus size={16} /> Add User
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-500">Name</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Email</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Role</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Status</th>
                  <th className="px-6 py-4 font-semibold text-slate-500">Created</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((u) => {
                  const status = u.status || "Active";
                  const statusStyles =
                    status === "Active"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : status === "Pending"
                        ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                        : "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
                  return (
                    <tr key={u.id} className="group transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 ring-1 ring-slate-200">
                            {(u.name || "U").charAt(0).toUpperCase()}
                          </div>
                          <button onClick={() => onOpenUser(u)} className="font-semibold text-slate-900 transition-colors hover:text-indigo-600">
                            {u.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${u.is_admin ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"}`}>
                          {u.is_admin ? "Admin" : "User"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-bold ${statusStyles}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-500">
                        {new Date(u.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => toggleDropdown(e, u.id)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${openDropdownId === u.id ? "bg-slate-200 text-slate-800" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          {openDropdownId === u.id && (
                            <div className="absolute right-0 top-10 z-[60] w-44 origin-top-right overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg animate-in fade-in slide-in-from-top-2">
                              <div className="flex flex-col py-1 text-left">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); openViewForm(u); }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                                >
                                  <Users size={14} className="text-slate-400" /> View User
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); openEditForm(u); }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                                >
                                  <Pencil size={14} className="text-slate-400" /> Edit User
                                </button>
                                <div className="my-1 border-t border-slate-100"></div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setOpenDropdownId(null); onDelete(u); }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={14} className="text-red-500" /> Delete User
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {users.length > 0 && (
          <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-6 py-4">
            <p className="text-sm text-slate-600">
              Showing <span className="font-bold text-slate-900">page {pagination.page} of {totalPages}</span> ({pagination.total} users)
            </p>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:shadow-none"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:shadow-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* CREATE / EDIT MODAL */}
      {showForm ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <form onSubmit={onSave} className="w-full max-w-lg space-y-5 rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">{isViewMode ? "View User" : editingUser ? "Edit User" : "Create User"}</h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                Close
              </button>
            </div>
            
            <div className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Full Name
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  disabled={isViewMode}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  disabled={isViewMode}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Password {editingUser && <span className="text-xs text-slate-400 font-normal">(Leave blank to keep current)</span>}
                <input
                  type="password"
                  value={isViewMode ? "********" : form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  required={!editingUser && !isViewMode}
                  minLength={8}
                  disabled={isViewMode}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500"
                />
              </label>
              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm font-medium text-slate-700">
                  Role
                  <select
                    value={form.role}
                    onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
                    disabled={isViewMode}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500"
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
                    disabled={isViewMode}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className={`rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 ${isViewMode ? "w-full" : "w-1/2"}`}
              >
                {isViewMode ? "Close" : "Cancel"}
              </button>
              {!isViewMode && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingUser ? "Update User" : "Create User"}
                </button>
              )}
            </div>
          </form>
        </div>
      ) : null}

      {/* USER REQUESTS MODAL */}
      {showRequests ? (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">User Requests</h3>
                <p className="text-sm text-slate-500">Review pending signup requests.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={loadPendingRequests}
                  disabled={requestsLoading}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setShowRequests(false)}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>

            {requestsError ? (
              <div className="px-6 pt-4">
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {requestsError}
                </div>
              </div>
            ) : null}

            <div className="max-h-[70vh] overflow-auto px-6 py-5">
              {requestsLoading ? (
                <div className="flex h-40 items-center justify-center text-sm font-medium text-slate-500">Loading requests...</div>
              ) : pendingUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Users size={32} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">No pending user requests</h3>
                  <p className="mt-1 text-sm text-slate-500">No new signups are waiting for approval.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pendingUsers.map((u) => (
                    <div
                      key={u.id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-bold text-slate-900">{u.name}</p>
                          <p className="mt-0.5 text-sm font-medium text-slate-600">{u.email}</p>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                          Pending
                        </span>
                      </div>

                      <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-semibold">First Name</span>
                          <span className="font-medium">{u.first_name || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-semibold">Last Name</span>
                          <span className="font-medium">{u.last_name || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-semibold">Company</span>
                          <span className="font-medium">{u.company || "-"}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-semibold">Role</span>
                          <span className="font-medium">{u.role || "User"}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-semibold">Signup Date</span>
                          <span className="font-medium">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "-"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-3">
                        <button
                          onClick={() => approvePending(u)}
                          className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => rejectPending(u)}
                          className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
