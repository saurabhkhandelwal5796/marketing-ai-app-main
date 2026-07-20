"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";

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
    external_attendees: Array.isArray(initialData?.external_attendees) ? initialData.external_attendees : [],
    meeting_type: initialData?.meeting_type || "Online",
    location: initialData?.location || "",
  }));
  const [attendeeQuery, setAttendeeQuery] = useState("");
  const [showAttendeePicker, setShowAttendeePicker] = useState(false);

  const isOnline = form.meeting_type === "Online";
  const modalTitle = initialData?.id ? "Edit Meeting" : "Schedule Meeting";
  const submitLabel = initialData?.id ? "Update Meeting" : "Create Meeting";
  const activeUsers = useMemo(() => (Array.isArray(users) ? users : []), [users]);
  const selectedUserSet = useMemo(() => new Set(form.attendees || []), [form.attendees]);

  const filteredSuggestions = useMemo(() => {
    const query = attendeeQuery.trim().toLowerCase();
    return activeUsers
      .filter((user) => !selectedUserSet.has(user.id))
      .filter((user) => {
        if (!query) return true;
        return String(user.name || "").toLowerCase().includes(query) || String(user.email || "").toLowerCase().includes(query);
      })
      .slice(0, 8);
  }, [activeUsers, attendeeQuery, selectedUserSet]);

  const addUserAttendee = (userId) => {
    setForm((prev) => ({
      ...prev,
      attendees: [...new Set([...(prev.attendees || []), userId])],
    }));
    setAttendeeQuery("");
  };

  const removeUserAttendee = (userId) => {
    setForm((prev) => ({
      ...prev,
      attendees: (prev.attendees || []).filter((id) => id !== userId),
    }));
  };

  const addExternalEmail = () => {
    const email = attendeeQuery.trim().toLowerCase();
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!isEmail) return;
    setForm((prev) => ({
      ...prev,
      external_attendees: [...new Set([...(prev.external_attendees || []), email])],
    }));
    setAttendeeQuery("");
  };

  const removeExternalEmail = (email) => {
    setForm((prev) => ({
      ...prev,
      external_attendees: (prev.external_attendees || []).filter((item) => item !== email),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const email = attendeeQuery.trim().toLowerCase();
          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
          const payload = isEmail
            ? {
                ...form,
                external_attendees: [...new Set([...(form.external_attendees || []), email])],
              }
            : form;
          onSubmit(payload);
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
            <div className="mt-1.5 rounded-xl border border-slate-300 bg-white p-2.5">
              <div className="mb-2 flex flex-wrap gap-2">
                {(form.attendees || []).map((userId) => {
                  const user = activeUsers.find((item) => item.id === userId);
                  if (!user) return null;
                  return (
                    <span
                      key={userId}
                      className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700"
                    >
                      {user.name}
                      {canEdit ? (
                        <button type="button" onClick={() => removeUserAttendee(userId)} className="text-blue-600 hover:text-blue-800">
                          x
                        </button>
                      ) : null}
                    </span>
                  );
                })}
                {(form.external_attendees || []).map((email) => (
                  <span
                    key={email}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                  >
                    {email}
                    {canEdit ? (
                      <button type="button" onClick={() => removeExternalEmail(email)} className="text-emerald-700 hover:text-emerald-900">
                        x
                      </button>
                    ) : null}
                  </span>
                ))}
              </div>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setShowAttendeePicker((prev) => !prev)}
                className="inline-flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <span>{showAttendeePicker ? "Hide attendee suggestions" : "Show attendee suggestions"}</span>
                {showAttendeePicker ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              <div
                className={`grid transition-all duration-200 ease-out ${
                  showAttendeePicker ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white">
                    <p className="px-3 py-2 text-xs font-semibold text-slate-500">Suggested contacts</p>
                    {filteredSuggestions.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => addUserAttendee(user.id)}
                        className="flex w-full items-center justify-between border-t border-slate-100 px-3 py-2 text-left hover:bg-slate-50"
                      >
                        <span className="text-sm font-medium text-slate-800">{user.name}</span>
                        <span className="text-xs text-slate-500">{user.email}</span>
                      </button>
                    ))}
                    {filteredSuggestions.length === 0 ? (
                      <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">No matching users found.</p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  disabled={!canEdit}
                  value={attendeeQuery}
                  onChange={(e) => setAttendeeQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
                      if (attendeeQuery.trim()) {
                        e.preventDefault();
                        addExternalEmail();
                      }
                    }
                  }}
                  placeholder="Type external email and press Enter"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={addExternalEmail}
                  disabled={!canEdit}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <Plus size={13} />
                  Add
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">Pick from suggestions or type an external email and press Enter.</p>
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
