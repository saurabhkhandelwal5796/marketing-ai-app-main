"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { getCurrentSessionId, getCurrentUserId } from "../../lib/getCurrentUserId";

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

  // Audit tracking - page visit
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
              page_name: "Email Templates",
              time_spent_ms: timeSpent,
              details: `Spent ${Math.round(timeSpent / 1000)} seconds on Email Templates page`,
              session_id: getCurrentSessionId(),
            }),
          }).catch(() => {});
        })();
      }
    };
  }, []);

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

  const trackAction = async (actionName, details) => {
    try {
      const currentUserId = await getCurrentUserId();
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "Email Templates",
          action_name: actionName,
          details: details,
          session_id: getCurrentSessionId(),
        }),
      });
    } catch {
      // Ignore tracking errors
    }
  };

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
      
      // Track action
      if (editingTemplate) {
        await trackAction("Edited Email Template", `Edited template: ${form.name}`);
      } else {
        await trackAction("Created Email Template", `Created template: ${form.name}`);
      }
      
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
    } catch (err) {
      setError(err?.message || "Failed to upload attachments.");
    }
  };

  const removeAttachment = (index) => {
    setForm((prev) => ({
      ...prev,
      case_studies: (prev.case_studies || []).filter((_, i) => i !== index),
    }));
  };

  const onDelete = async (item) => {
    const ok = window.confirm(`Delete "${item.name}"?`);
    if (!ok) return;
    setError("");
    try {
      const res = await fetch(`/api/email-templates/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to delete template.");
      
      // Track action
      await trackAction("Deleted Email Template", `Deleted template: ${item.name}`);
      
      setSuccess("Template deleted.");
      load({ page, search: debouncedSearch });
    } catch (e) {
      setError(e?.message || "Failed to delete template.");
    }
  };

  const totalPages = Math.max(1, Math.ceil((pagination?.total || 0) / pageSize));

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Email Templates</h1>
            <p className="text-sm text-slate-500">Manage reusable templates for campaign emails.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-48 rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <button
              onClick={openCreateForm}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              + New Template
            </button>
          </div>
        </div>

        {error ? (
          <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="mx-5 mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
        ) : null}

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">Loading templates...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Preview</th>
                  <th className="px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{t.name}</td>
                    <td className="px-5 py-3 text-slate-700">{t.subject}</td>
                    <td className="px-5 py-3 text-slate-600">{previewBody(t.body)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditForm(t)}
                          className="rounded-lg border border-slate-300 bg-white p-2 hover:bg-slate-50"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => onDelete(t)}
                          className="rounded-lg border border-red-300 bg-white p-2 text-red-700 hover:bg-red-50"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {templates.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                      No templates yet. Create your first template.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
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
              {submitting ? "Saving..." : "Save Template"}
            </button>
          </form>
        </div>
      ) : null}
    </main>
  );
}
