"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

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
  const [form, setForm] = useState({ name: "", body: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/email-templates/${templateId}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load template.");
      setTemplate(data.template || null);
      setForm({ name: data.template?.name || "", body: data.template?.body || "" });
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

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Email Template Detail</h1>
          <button
            onClick={() => router.push("/email-templates")}
            className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to List
          </button>
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
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
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
                Email Body
                {editing ? (
                  <textarea
                    rows={12}
                    value={form.body}
                    onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                ) : (
                  <pre className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800">
                    {template.body}
                  </pre>
                )}
              </label>
              <p className="text-xs text-slate-500">Created: {new Date(template.created_at).toLocaleString()}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">Actions</p>
              <div className="mt-3 space-y-2">
                {editing ? (
                  <>
                    <button
                      onClick={onSave}
                      disabled={saving}
                      className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setEditing(true)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={copyBody}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                    >
                      Copy Body
                    </button>
                    <button
                      onClick={onDelete}
                      className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
