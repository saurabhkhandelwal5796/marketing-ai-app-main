"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";

function SortableHeader({ label, sortKey, sortBy, sortOrder, onSort }) {
  const isActive = sortBy === sortKey;
  const isAsc = isActive && sortOrder === "asc";
  const isDesc = isActive && sortOrder === "desc";

  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500"
      onClick={() => onSort(sortKey)}
    >
      <button
        type="button"
        className="group inline-flex items-center gap-1.5 transition-colors hover:text-slate-700"
      >
        <span>{label}</span>
        {isAsc ? (
          <ArrowUp size={14} className="text-indigo-600" />
        ) : isDesc ? (
          <ArrowDown size={14} className="text-indigo-600" />
        ) : (
          <ArrowUpDown size={14} className="text-slate-400 opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </button>
    </th>
  );
}

function previewBody(text) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (value.length <= 90) return value;
  return `${value.slice(0, 90)}...`;
}

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function EmailTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState("desc");
  const [openActionId, setOpenActionId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState({ name: "", subject: "", body: "", case_studies: [] });

  const load = async (overrides = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        search: overrides.search ?? debouncedSearch,
        page: String(overrides.page ?? page),
        pageSize: String(overrides.pageSize ?? pageSize),
        sortBy: overrides.sortBy ?? sortBy,
        sortOrder: overrides.sortOrder ?? sortOrder,
      });
      const res = await fetch(`/api/email-templates?${params.toString()}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load templates.");
      setTemplates(Array.isArray(data.templates) ? data.templates : []);
      setPagination(data.pagination || { page: 1, pageSize: overrides.pageSize ?? pageSize, total: 0 });
    } catch (e) {
      setError(e?.message || "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, pageSize, sortBy, sortOrder]);

  useEffect(() => {
    load({ page, search: debouncedSearch, pageSize, sortBy, sortOrder });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, pageSize, sortBy, sortOrder]);

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
      setForm({ name: "", subject: "", body: "", case_studies: [] });
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
    setForm({ name: "", subject: "", body: "", case_studies: [] });
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingTemplate(item);
    setForm({
      name: item.name || "",
      subject: item.subject || "",
      body: item.body || "",
      case_studies: Array.isArray(item.case_studies) ? item.case_studies : [],
    });
    setShowForm(true);
  };

  const onAttachmentFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setError("");
    try {
      for (const file of files) {
        if (file.size > MAX_ATTACHMENT_SIZE) {
          throw new Error(`"${file.name}" exceeds 5MB limit.`);
        }
      }
      const uploads = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          type: file.type || "application/octet-stream",
          size: file.size,
          dataUrl: await readFileAsDataUrl(file),
        }))
      );
      setForm((prev) => ({ ...prev, case_studies: [...(prev.case_studies || []), ...uploads] }));
    } catch (e) {
      setError(e?.message || "Failed to attach files.");
    } finally {
      event.target.value = "";
    }
  };

  const removeAttachment = (index) => {
    setForm((prev) => ({
      ...prev,
      case_studies: (prev.case_studies || []).filter((_, idx) => idx !== index),
    }));
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

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((pagination.total || 0) / (pagination.pageSize || pageSize))),
    [pagination.total, pagination.pageSize, pageSize]
  );

  const onSort = (key) => {
    setOpenActionId(null);
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    setSortOrder("asc");
  };

  return (
    <main className="min-h-full bg-slate-50 p-6">
      <section className="rounded-xl bg-white p-6 shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email Templates</h1>
            <p className="mt-1 text-sm text-slate-500">Manage reusable email drafts for campaigns.</p>
          </div>
          <button
            onClick={openCreateForm}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-105 hover:bg-slate-800 hover:shadow-md"
          >
            <Plus size={16} />
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
        <div className="mt-6">
          <div className="flex items-center justify-end">
            <div className="relative w-full max-w-sm">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full rounded-full border border-slate-200 py-2.5 pl-11 pr-4 text-sm text-slate-700 outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
            />
            </div>
          </div>

        {loading ? <div className="mt-4 text-sm text-slate-500">Loading...</div> : null}

        {!loading ? (
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                <tr>
                    <SortableHeader label="Template Name" sortKey="name" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Email Body</th>
                    <SortableHeader label="Created At" sortKey="created_at" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
                <tbody className="bg-white">
                {templates.map((item) => (
                    <tr
                      key={item.id}
                      className="cursor-pointer border-t border-slate-100 transition-all duration-200 hover:bg-slate-50 hover:shadow-[inset_0_1px_0_rgba(15,23,42,0.02)]"
                    >
                      <td className="px-4 py-4 text-left text-base font-semibold text-indigo-700">
                        <button
                          onClick={() => router.push(`/email-templates/${item.id}`)}
                          className="text-left transition-all duration-200 hover:underline"
                        >
                        {item.name}
                      </button>
                    </td>
                      <td className="px-4 py-4 text-left text-slate-700">{item.subject || "-"}</td>
                      <td className="max-w-[320px] truncate px-4 py-4 text-left text-slate-600">{previewBody(item.body)}</td>
                      <td className="px-4 py-4 text-left text-xs font-medium text-slate-500">
                        {new Date(item.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative inline-block">
                        <button
                            type="button"
                            onClick={() => setOpenActionId((prev) => (prev === item.id ? null : item.id))}
                            className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-all duration-200 hover:bg-slate-50"
                        >
                            Actions
                            <ChevronDown size={14} />
                        </button>
                          {openActionId === item.id ? (
                            <div className="absolute right-0 z-20 mt-2 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  router.push(`/email-templates/${item.id}`);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-50"
                              >
                                <Eye size={14} />
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  openEditForm(item);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 transition-colors hover:bg-slate-50"
                              >
                                <Pencil size={14} />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionId(null);
                                  onDelete(item);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 transition-colors hover:bg-red-50"
                              >
                                <Trash2 size={14} />
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No templates found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

          <div className="mt-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-500">Rows per page</label>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(1);
                  setPageSize(Number(e.target.value));
                }}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none transition-all duration-200 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <p className="text-sm text-slate-600">
            Showing page {pagination.page} of {totalPages} ({pagination.total} templates)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm transition-all duration-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
        </div>
      </section>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/30 p-4 sm:items-center">
          <form
            onSubmit={saveTemplate}
            className="my-4 max-h-[90vh] w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
          >
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
              Subject
              <input
                required
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
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
            <label className="block text-sm font-medium text-slate-700">
              Attachment (PDF/DOC/DOCX/TXT)
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                multiple
                onChange={onAttachmentFiles}
                className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold"
              />
              <p className="mt-1 text-xs text-slate-500">Max file size: 5MB each.</p>
            </label>
            {(form.case_studies || []).length ? (
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-700">Attached Files</p>
                {(form.case_studies || []).map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2">
                    <p className="truncate text-sm text-slate-700">
                      {file.name} {file.size ? `(${Math.round(file.size / 1024)} KB)` : ""}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Template"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
