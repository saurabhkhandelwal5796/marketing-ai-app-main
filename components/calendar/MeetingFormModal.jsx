"use client";

import { useMemo, useState } from "react";

function toLocalDateTimeValue(value) {
  if (!value) return "";
  const d = new Date(value);
  const adjusted = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

export default function MeetingFormModal({
  isOpen,
  onClose,
  onSubmit,
  users,
  initialData,
  submitting = false,
  canEdit = true,
}) {
  const [form, setForm] = useState(() => ({
    title: initialData?.title || "",
    description: initialData?.description || "",
    start_time: toLocalDateTimeValue(initialData?.start_time),
    end_time: toLocalDateTimeValue(initialData?.end_time),
    attendees: Array.isArray(initialData?.attendees) ? initialData.attendees : [],
    meeting_type: initialData?.meeting_type || "Online",
    location: initialData?.location || "",
  }));

  const isOnline = form.meeting_type === "Online";
  const modalTitle = initialData?.id ? "Edit Meeting" : "Schedule Meeting";
  const submitLabel = initialData?.id ? "Update Meeting" : "Create Meeting";
  const activeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
        className="max-h-[90vh] w-full max-w-2xl space-y-4 overflow-auto rounded-2xl bg-white p-5 shadow-xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{modalTitle}</h3>
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            Close
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Title
            <input
              required
              disabled={!canEdit}
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Description
            <textarea
              rows={3}
              disabled={!canEdit}
              value={form.description}
              onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Start Date & Time
            <input
              type="datetime-local"
              required
              disabled={!canEdit}
              value={form.start_time}
              onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            End Date & Time
            <input
              type="datetime-local"
              required
              disabled={!canEdit}
              value={form.end_time}
              onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Attendees
            <select
              multiple
              disabled={!canEdit}
              value={form.attendees}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  attendees: Array.from(e.target.selectedOptions).map((option) => option.value),
                }))
              }
              className="mt-1.5 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              {activeUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-slate-500">Hold Ctrl (Windows) or Command (Mac) to select multiple attendees.</p>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Meeting Type
            <select
              disabled={!canEdit}
              value={form.meeting_type}
              onChange={(e) => setForm((prev) => ({ ...prev, meeting_type: e.target.value }))}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
            >
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-700">
            {isOnline ? "Meeting Link" : "Location"}
            <input
              required
              disabled={!canEdit}
              value={form.location}
              onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
              placeholder={isOnline ? "https://meet.example.com/..." : "Conference Room A"}
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
          </label>
        </div>

        {canEdit ? (
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {submitting ? "Saving..." : submitLabel}
          </button>
        ) : null}
      </form>
    </div>
  );
}
