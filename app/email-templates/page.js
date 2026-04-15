"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";

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
  const [pageSize] = useState(10);
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
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    load({ page, search: debouncedSearch });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

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
              placeholder="Search by name, subject, or body"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {loading ? <div className="mt-4 text-sm text-slate-500">Loading...</div> : null}

        {!loading ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Template Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-slate-700">Subject</th>
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
                    <td className="px-3 py-2 text-slate-700">{item.subject || "-"}</td>
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
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
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
              {submitting ? "Saving..." : editingTemplate ? "Update Template" : "Save Template"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
