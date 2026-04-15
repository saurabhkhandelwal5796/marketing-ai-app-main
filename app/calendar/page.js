"use client";

import { useEffect, useMemo, useState } from "react";
import CalendarHeader from "../../components/calendar/CalendarHeader";
import CalendarGrid from "../../components/calendar/CalendarGrid";
import MeetingFormModal from "../../components/calendar/MeetingFormModal";
import MeetingDetailsModal from "../../components/calendar/MeetingDetailsModal";
import { addDays, addMonths, CALENDAR_VIEWS, getRangeForView } from "../../lib/calendarUtils";

function shiftDateByView(date, view, direction) {
  if (view === CALENDAR_VIEWS.DAY) return addDays(date, direction);
  if (view === CALENDAR_VIEWS.WEEK) return addDays(date, direction * 7);
  return addMonths(date, direction);
}

export default function CalendarPage() {
  const [activeDate, setActiveDate] = useState(new Date());
  const [view, setView] = useState(CALENDAR_VIEWS.MONTH);
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const loadMeetings = async (date = activeDate, mode = view) => {
    setLoading(true);
    setError("");
    try {
      const range = getRangeForView(date, mode);
      const params = new URLSearchParams({
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      });
      const [meetingsRes, usersRes, sessionRes] = await Promise.all([
        fetch(`/api/meetings?${params.toString()}`),
        fetch("/api/meetings/users"),
        fetch("/api/auth/session"),
      ]);

      const meetingsData = await meetingsRes.json();
      const usersData = await usersRes.json();
      const sessionData = await sessionRes.json();

      if (!meetingsRes.ok || meetingsData?.error) throw new Error(meetingsData?.error || "Failed to fetch meetings.");
      if (!usersRes.ok || usersData?.error) throw new Error(usersData?.error || "Failed to load users.");
      if (!sessionRes.ok || !sessionData?.user) throw new Error("Failed to load session.");

      setMeetings(Array.isArray(meetingsData.meetings) ? meetingsData.meetings : []);
      setUsers(Array.isArray(usersData.users) ? usersData.users : []);
      setSessionUser(sessionData.user);
    } catch (e) {
      setError(e?.message || "Failed to load calendar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings(activeDate, view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate, view]);

  const openCreateModal = () => {
    setEditingMeeting({
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      attendees: sessionUser?.id ? [sessionUser.id] : [],
      meeting_type: "Online",
    });
    setFormOpen(true);
  };

  const openEditModal = (meeting) => {
    setEditingMeeting(meeting);
    setDetailsOpen(false);
    setFormOpen(true);
  };

  const canManageMeeting = (meeting) => !!(sessionUser?.is_admin || meeting?.created_by === sessionUser?.id);

  const saveMeeting = async (payload) => {
    setSaving(true);
    setError("");
    try {
      const formatted = {
        ...payload,
        start_time: new Date(payload.start_time).toISOString(),
        end_time: new Date(payload.end_time).toISOString(),
      };
      const res = editingMeeting?.id
        ? await fetch(`/api/meetings/${editingMeeting.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formatted),
          })
        : await fetch("/api/meetings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(formatted),
          });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to save meeting.");
      setFormOpen(false);
      setEditingMeeting(null);
      await loadMeetings(activeDate, view);
    } catch (e) {
      setError(e?.message || "Failed to save meeting.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMeeting = async (meeting) => {
    if (!meeting?.id) return;
    const confirmDelete = window.confirm(`Delete "${meeting.title}"?`);
    if (!confirmDelete) return;
    setError("");
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to delete meeting.");
      setDetailsOpen(false);
      setSelectedMeeting(null);
      await loadMeetings(activeDate, view);
    } catch (e) {
      setError(e?.message || "Failed to delete meeting.");
    }
  };

  return (
    <main className="space-y-5 p-6">
      <CalendarHeader
        activeDate={activeDate}
        view={view}
        onViewChange={setView}
        onPrevious={() => setActiveDate((prev) => shiftDateByView(prev, view, -1))}
        onNext={() => setActiveDate((prev) => shiftDateByView(prev, view, 1))}
        onToday={() => setActiveDate(new Date())}
        onCreateMeeting={openCreateModal}
      />

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading calendar...</div>
      ) : (
        <CalendarGrid
          view={view}
          activeDate={activeDate}
          meetings={meetings}
          onMeetingClick={(meeting) => {
            setSelectedMeeting(meeting);
            setDetailsOpen(true);
          }}
        />
      )}

      {formOpen ? (
        <MeetingFormModal
          key={editingMeeting?.id || editingMeeting?.start_time || "new-meeting"}
          isOpen={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingMeeting(null);
          }}
          onSubmit={saveMeeting}
          users={users}
          initialData={editingMeeting}
          submitting={saving}
        />
      ) : null}

      <MeetingDetailsModal
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        meeting={selectedMeeting}
        userMap={userMap}
        canManage={canManageMeeting(selectedMeeting)}
        onEdit={() => openEditModal(selectedMeeting)}
        onDelete={() => deleteMeeting(selectedMeeting)}
      />
    </main>
  );
}
