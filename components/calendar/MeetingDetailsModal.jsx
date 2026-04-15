"use client";

import { formatDateTime } from "../../lib/calendarUtils";

export default function MeetingDetailsModal({
  meeting,
  userMap,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  canManage,
}) {
  if (!isOpen || !meeting) return null;

  const attendeeNames = (meeting.attendees || [])
    .map((id) => userMap.get(id)?.name || userMap.get(id)?.email || "Unknown user")
    .join(", ");
  const externalAttendees = Array.isArray(meeting.external_attendees) ? meeting.external_attendees.join(", ") : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl space-y-4 rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{meeting.title}</h3>
          <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700">
            Close
          </button>
        </div>

        <div className="space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">Description:</span> {meeting.description || "No description"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Start:</span> {formatDateTime(meeting.start_time)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">End:</span> {formatDateTime(meeting.end_time)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Type:</span> {meeting.meeting_type}
          </p>
          <p>
            <span className="font-semibold text-slate-900">{meeting.meeting_type === "Online" ? "Meeting Link:" : "Location:"}</span>{" "}
            {meeting.location || "-"}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Attendees:</span> {attendeeNames || "No attendees"}
          </p>
          {externalAttendees ? (
            <p>
              <span className="font-semibold text-slate-900">External Attendees:</span> {externalAttendees}
            </p>
          ) : null}
        </div>

        {canManage ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Edit
            </button>
            <button
              onClick={onDelete}
              className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
