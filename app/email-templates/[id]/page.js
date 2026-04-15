"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, Copy, PencilLine, Save, Trash2, X } from "lucide-react";

const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export default function EmailTemplateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = String(params?.id || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [template, setTemplate] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body: "", case_studies: [] });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/email-templates/${templateId}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load template.");
      setTemplate(data.template || null);
      setForm({
        name: data.template?.name || "",
        subject: data.template?.subject || "",
        body: data.template?.body || "",
        case_studies: Array.isArray(data.template?.case_studies) ? data.template.case_studies : [],
      });
    } catch (e) {
      setError(e?.message || "Failed to load template.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (templateId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const onSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/email-templates/${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to update template.");
      setTemplate(data.template);
      setEditing(false);
      setSuccess("Template updated.");
    } catch (e) {
      setError(e?.message || "Failed to update template.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    const ok = window.confirm(`Delete template "${template?.name}"?`);
    if (!ok) return;
    setError("");
    try {
      const res = await fetch(`/api/email-templates/${templateId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to delete template.");
      router.push("/email-templates");
    } catch (e) {
      setError(e?.message || "Failed to delete template.");
    }
  };

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(template?.body || "");
      setSuccess("Email body copied.");
    } catch {
      setError("Failed to copy.");
    }
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

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-semibold text-slate-900">Email Template Detail</h1>
          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => router.push("/email-templates")}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to List
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowActionsMenu((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Actions
                <ChevronDown size={15} />
              </button>
              {showActionsMenu ? (
                <div className="absolute right-0 top-11 z-20 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  {editing ? (
                    <>
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          onSave();
                        }}
                        disabled={saving}
                        className="inline-flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <Save size={14} />
                        {saving ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          setEditing(false);
                        }}
                        className="inline-flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          setEditing(true);
                        }}
                        className="inline-flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
                      >
                        <PencilLine size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setShowActionsMenu(false);
                          onDelete();
                        }}
                        className="inline-flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
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

        {!loading && template ? (
          <div className="mt-4">
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                  Template
                </span>
                <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  {new Date(template.created_at).toLocaleDateString()}
                </span>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Template Name
                {editing ? (
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-900">{template.name}</p>
                )}
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Subject
                {editing ? (
                  <input
                    value={form.subject}
                    onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-slate-900">{template.subject || "-"}</p>
                )}
              </label>
              <div className="block text-sm font-medium text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Email Body</span>
                  {!editing ? (
                    <button
                      onClick={copyBody}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Copy size={14} />
                      Copy Body
                    </button>
                  ) : null}
                </div>
                {editing ? (
                  <textarea
                    rows={12}
                    value={form.body}
                    onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                ) : (
                  <pre className="mt-1 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800">
                    {template.body}
                  </pre>
                )}
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Attachment
                {editing ? (
                  <>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                      multiple
                      onChange={onAttachmentFiles}
                      className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold"
                    />
                    <div className="mt-2 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                      {(form.case_studies || []).length ? (
                        (form.case_studies || []).map((file, index) => (
                          <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
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
                        ))
                      ) : (
                        <p className="text-xs text-slate-500">No attachments.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="mt-1 space-y-2">
                    {(template.case_studies || []).length ? (
                      template.case_studies.map((file, index) => (
                        <a
                          key={`${file.name}-${index}`}
                          href={file.dataUrl}
                          download={file.name}
                          className="block rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-blue-700 hover:underline"
                        >
                          {file.name}
                        </a>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">No attachments.</p>
                    )}
                  </div>
                )}
              </label>
              <p className="text-xs text-slate-500">Created: {new Date(template.created_at).toLocaleString()}</p>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
