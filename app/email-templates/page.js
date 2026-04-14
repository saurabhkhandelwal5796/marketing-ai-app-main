"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

function previewBody(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= 90) return value;
  return `${value.slice(0, 90)}...`;
}

export default function EmailTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState({ name: "", body: "" });

  const load = async (overrides = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        search: overrides.search ?? search,
        sortBy: overrides.sortBy ?? sortBy,
        sortOrder: overrides.sortOrder ?? sortOrder,
        page: String(overrides.page ?? page),
        pageSize: String(pageSize),
      });
      const res = await fetch(`/api/email-templates?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load templates.");
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
      setPagination(data.pagination || { page: 1, pageSize, total: 0 });
    } catch (e) {
      setError(e?.message || "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load({ page });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const saveTemplate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const res = editingTemplate
        ? await fetch(`/api/email-templates/${editingTemplate.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          })
        : await fetch("/api/email-templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to save template.");
      setShowForm(false);
      setEditingTemplate(null);
      setForm({ name: "", body: "" });
      setSuccess(editingTemplate ? "Template updated." : "Template saved.");
      setPage(1);
      load({ page: 1 });
      if (!editingTemplate && data?.template?.id) {
        router.push(`/email-templates/${data.template.id}`);
      }
    } catch (e2) {
      setError(e2?.message || "Failed to save template.");
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateForm = () => {
    setEditingTemplate(null);
    setForm({ name: "", body: "" });
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingTemplate(item);
    setForm({ name: item.name || "", body: item.body || "" });
    setShowForm(true);
  };

  const onDelete = async (item) => {
    const ok = window.confirm(`Delete template "${item?.name}"?`);
    if (!ok) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/email-templates/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to delete template.");
      setSuccess("Template deleted.");
      load({ page });
    } catch (e) {
      setError(e?.message || "Failed to delete template.");
    }
  };

  const totalPages = Math.max(1, Math.ceil((pagination.total || 0) / pageSize));

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Email Templates</h1>
            <p className="mt-1 text-sm text-slate-500">Manage reusable email drafts for campaigns.</p>
          </div>
          <button
            onClick={openCreateForm}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
          >
            New Template
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">All Templates</h2>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search template name"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="created_at">Created At</option>
              <option value="name">Template Name</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
            <button
              onClick={() => {
                setPage(1);
                load({ page: 1, search, sortBy, sortOrder });
              }}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Apply
            </button>
          </div>
        </div>

        {loading ? <div className="mt-4 text-sm text-slate-500">Loading...</div> : null}

        {!loading ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Template Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Email Body</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Created At</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {templates.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-semibold text-blue-700">
                      <button onClick={() => router.push(`/email-templates/${item.id}`)} className="hover:underline">
                        {item.name}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-slate-700">{previewBody(item.body)}</td>
                    <td className="px-3 py-2 text-slate-700">{new Date(item.created_at).toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => router.push(`/email-templates/${item.id}`)}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openEditForm(item)}
                          className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                          title="Edit template"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => onDelete(item)}
                          className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                          title="Delete template"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                      No templates found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing page {pagination.page} of {totalPages} ({pagination.total} templates)
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
          <form onSubmit={saveTemplate} className="w-full max-w-2xl space-y-4 rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {editingTemplate ? "Edit Template" : "New Template"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingTemplate(null);
                }}
                className="text-sm text-slate-500"
              >
                Close
              </button>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Email Template Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email Body
              <textarea
                required
                rows={10}
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Saving..." : editingTemplate ? "Update Template" : "Save Template"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
