"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, ArrowRight, BarChart3, CheckCircle2, Clock } from "lucide-react";
import CalendarHeader from "../../components/calendar/CalendarHeader";
import CalendarGrid from "../../components/calendar/CalendarGrid";
import MeetingFormModal from "../../components/calendar/MeetingFormModal";
import MeetingDetailsModal from "../../components/calendar/MeetingDetailsModal";
import { addDays, addMonths, CALENDAR_VIEWS, getRangeForView } from "../../lib/calendarUtils";
import { getCurrentSessionId, getCurrentUserId } from "../../lib/getCurrentUserId";

function shiftDateByView(date, view, direction) {
  if (view === CALENDAR_VIEWS.DAY) return addDays(date, direction);
  if (view === CALENDAR_VIEWS.WEEK) return addDays(date, direction * 7);
  return addMonths(date, direction);
}

function formatDateLabel(date) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CalendarPage() {
  const [activeDate, setActiveDate] = useState(new Date());
  const [view, setView] = useState(CALENDAR_VIEWS.MONTH);
  const [meetings, setMeetings] = useState([]);
  const [users, setUsers] = useState([]);
  const [sessionUser, setSessionUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const [formOpen, setFormOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  const userMap = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);

  const trackCalendarAction = async (actionName, details) => {
    try {
      const currentUserId = await getCurrentUserId();
      await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "Calendar",
          action_name: actionName,
          details,
          session_id: getCurrentSessionId(),
        }),
      });
    } catch {
      // ignore tracking failures
    }
  };

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
              page_name: "Calendar",
              time_spent_ms: timeSpent,
              details: `Spent ${Math.round(timeSpent / 1000)} seconds on Calendar page`,
              session_id: getCurrentSessionId(),
            }),
          }).catch(() => {});
        })();
      }
    };
  }, []);

  const loadMeetings = async (date = activeDate, mode = view) => {
    setLoading(true);
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
      showToast("error", e?.message || "Failed to load calendar.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings(activeDate, view);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDate, view]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  const openCreateModal = (date = null) => {
    const baseDate = date ? new Date(date) : new Date();
    if (date) {
      baseDate.setHours(9, 0, 0, 0); // Default to 9 AM if a specific day is clicked
    }
    
    setEditingMeeting({
      start_time: baseDate.toISOString(),
      end_time: new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString(),
      attendees: sessionUser?.id ? [sessionUser.id] : [],
      external_attendees: [],
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
    if (!String(payload?.description || "").trim()) {
      showToast("error", "Description is required.");
      return;
    }
    setSaving(true);
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
      const savedMeeting = data?.meeting || null;
      
      // Track action
      if (editingMeeting?.id) {
        await trackCalendarAction("Updated Calendar Event", `Updated event: ${payload.title}`);
      } else {
        const eventDate = formatDateLabel(new Date(payload.start_time));
        await trackCalendarAction("Created Calendar Event", `Created event: ${payload.title} on ${eventDate}`);
      }
      
      setFormOpen(false);
      setEditingMeeting(null);
      setSelectedMeeting(null);
      setDetailsOpen(false);
      showToast("success", editingMeeting?.id ? "Meeting updated successfully." : "Meeting is scheduled");
      if (savedMeeting?.id) {
        setMeetings((prev) => {
          if (editingMeeting?.id) {
            return prev.map((item) => (item.id === savedMeeting.id ? savedMeeting : item));
          }
          return [...prev, savedMeeting].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        });
      } else {
        await loadMeetings(activeDate, view);
      }
    } catch (e) {
      showToast("error", e?.message || "Failed to save meeting.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMeeting = async (meeting) => {
    if (!meeting?.id) return;
    const confirmDelete = window.confirm(`Delete "${meeting.title}"?`);
    if (!confirmDelete) return;
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to delete meeting.");
      setDetailsOpen(false);
      setSelectedMeeting(null);
      showToast("success", "Meeting deleted successfully.");
      setMeetings((prev) => prev.filter((item) => item.id !== meeting.id));
    } catch (e) {
      showToast("error", e?.message || "Failed to delete meeting.");
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
        onCreateMeeting={() => openCreateModal()}
        totalEvents={meetings.length}
      />

      {toast ? (
        <div
          className={`fixed left-1/2 top-6 z-[120] -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-md ${
            toast?.type === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {toast?.message}
        </div>
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
          onCreateMeeting={(date) => openCreateModal(date)}
        />
      )}

      {/* BOTTOM INSIGHTS SECTION */}
      {!loading && (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          
          {/* 1. AI Recommendation Card */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-indigo-500 opacity-[0.04] blur-2xl"></div>
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <Sparkles size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">AI Insight</h3>
              </div>
              <p className="text-sm font-medium text-slate-700">
                Post engagement for <span className="font-bold text-indigo-700">LinkedIn</span> is historically highest on Tuesdays at 10:00 AM.
              </p>
            </div>
            <button className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700">
              Apply Suggestion <ArrowRight size={14} />
            </button>
          </div>

          {/* 2. Campaign Mix Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <BarChart3 size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Campaign Mix</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="mb-1.5 flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">Email</span>
                  <span className="text-blue-600">65%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: '65%' }}></div>
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-xs font-semibold">
                  <span className="text-slate-700">Social Media</span>
                  <span className="text-purple-600">35%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-purple-500" style={{ width: '35%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Upcoming Tasks Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <CheckCircle2 size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Upcoming Tasks</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Finalize Ad Copy</span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Clock size={10} /> Today, 2:00 PM
                  </span>
                </div>
                <div className="flex -space-x-2">
                  <div className="h-6 w-6 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[8px] font-bold text-indigo-700">JD</div>
                  <div className="h-6 w-6 rounded-full border-2 border-white bg-pink-100 flex items-center justify-center text-[8px] font-bold text-pink-700">AM</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-800">Review Email Draft</span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                    <Clock size={10} /> Tomorrow, 10:00 AM
                  </span>
                </div>
                <div className="flex -space-x-2">
                  <div className="h-6 w-6 rounded-full border-2 border-white bg-emerald-100 flex items-center justify-center text-[8px] font-bold text-emerald-700">SJ</div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
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
