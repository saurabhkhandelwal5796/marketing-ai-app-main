"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentSessionId, getCurrentUserId } from "../../lib/getCurrentUserId";
import { Pencil, Trash2 } from "lucide-react";
import Avatar from "../../components/Avatar";

const PENDING_VIEW_TASK_KEY = "audit.pendingViewedTask";

const PRIORITY_STYLES = {
  Low: "border-slate-300 bg-white text-slate-700",
  Medium: "border-blue-200 bg-blue-50 text-blue-700",
  High: "border-amber-200 bg-amber-50 text-amber-800",
  Urgent: "border-red-200 bg-red-50 text-red-700",
};

const STATUS_STYLES = {
  "To Do": "border-slate-300 bg-white text-slate-700",
  "In Progress": "border-blue-200 bg-blue-50 text-blue-700",
  Done: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const FILTERS = [
  "All Tasks",
  "My Tasks",
  "Today's Tasks",
  "This Week",
  "Last Week",
  "High Priority",
  "Urgent",
  "Overdue",
];
const STATUS_STEPS = ["To Do", "In Progress", "Done"];

function ymd(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDatePretty(dateStrOrIso) {
  if (!dateStrOrIso) return "-";
  const d = new Date(dateStrOrIso.includes("T") ? dateStrOrIso : `${dateStrOrIso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function isPastDue(dateStr) {
  if (!dateStr) return false;
  const due = new Date(`${dateStr}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day; // Monday
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function dateInRange(dateStr, start, end) {
  if (!dateStr) return false;
  const dt = new Date(`${dateStr}T00:00:00`);
  return dt >= start && dt <= end;
}

function createdInLastDays(iso, days) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return now.getTime() - d.getTime() <= days * 24 * 60 * 60 * 1000;
}

function StatusPipeline({ value, onChange, disabled = false, compact = false, onClick }) {
  const currentIndex = STATUS_STEPS.indexOf(value);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;
  return (
    <div className={`flex items-center gap-1 ${compact ? "text-[11px]" : "text-xs"}`} onClick={onClick}>
      {STATUS_STEPS.map((step, idx) => {
        const isCurrent = idx === activeIdx;
        const isCompleted = activeIdx === STATUS_STEPS.length - 1 ? true : idx < activeIdx;
        const classes = isCurrent
          ? "bg-blue-600 text-white border-blue-600"
          : isCompleted
          ? "bg-emerald-600 text-white border-emerald-600"
          : "bg-slate-100 text-slate-500 border-slate-300";
        return (
          <div key={step} className="flex items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation();
                onChange(step);
              }}
              className={`rounded-full border px-2.5 py-1 font-semibold transition ${classes} ${
                disabled ? "cursor-not-allowed opacity-60" : "hover:opacity-90"
              }`}
            >
              {step}
            </button>
            {idx < STATUS_STEPS.length - 1 ? <span className="text-slate-400">→</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export default function MyTasksPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [campaignsById, setCampaignsById] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [view, setView] = useState("list"); // list | kanban
  const [activeFilter, setActiveFilter] = useState("All Tasks");
  const [search, setSearch] = useState("");
  const selectAllRef = useRef(null);

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
              page_name: "My Tasks",
              time_spent_ms: timeSpent,
              details: `Spent ${Math.round(timeSpent / 1000)} seconds on My Tasks page`,
              session_id: getCurrentSessionId(),
            }),
          }).catch(() => {});
        })();
      }
    };
  }, []);

  useEffect(() => {
    const loadUsers = async () => {
      setLoadingUsers(true);
      setError("");
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load users.");
        const list = Array.isArray(data.users) ? data.users : [];
        setUsers(list);
        const qp =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("userId") || ""
            : "";
        const preferred = qp && list.some((u) => u.id === qp) ? qp : "";
        if (!userId && (preferred || list[0]?.id)) setUserId(preferred || list[0].id);
      } catch (e) {
        setError(e?.message || "Failed to load users.");
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTasks = async () => {
    setLoadingTasks(true);
    setError("");
    try {
      const res = await fetch(`/api/tasks`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load tasks.");
      const list = Array.isArray(data.tasks) ? data.tasks : [];
      // Avoid navigation/API calls with undefined ids
      setTasks(list.filter((t) => t && typeof t.id === "string" && t.id.length > 0));
    } catch (e) {
      setError(e?.message || "Failed to load tasks.");
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadCampaigns = async () => {
      try {
        const res = await fetch("/api/campaigns");
        const data = await res.json();
        if (!res.ok || data?.error) return;
        const map = {};
        (data.campaigns || []).forEach((c) => {
          if (c?.id) map[c.id] = c;
        });
        setCampaignsById(map);
      } catch (_) {
        // ignore campaign lookup failures
      }
    };
    loadCampaigns();
  }, []);

  const tasksFiltered = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekEnd = endOfWeek(today);
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekEnd);
    lastWeekEnd.setDate(lastWeekEnd.getDate() - 7);

    let list = tasks.filter((t) => t && typeof t.id === "string" && t.id.length > 0);

    if (activeFilter === "My Tasks") {
      list = list.filter((t) => (userId ? t.assignee_id === userId : false));
    } else if (activeFilter === "Today's Tasks") {
      const todayStr = ymd(today);
      list = list.filter((t) => t.due_date === todayStr || String(t.created_at || "").startsWith(todayStr));
    } else if (activeFilter === "This Week") {
      list = list.filter((t) => dateInRange(t.due_date, weekStart, weekEnd));
    } else if (activeFilter === "Last Week") {
      list = list.filter((t) => dateInRange(t.due_date, lastWeekStart, lastWeekEnd));
    } else if (activeFilter === "High Priority") {
      list = list.filter((t) => t.priority === "High");
    } else if (activeFilter === "Urgent") {
      list = list.filter((t) => t.priority === "Urgent");
    } else if (activeFilter === "Overdue") {
      list = list.filter((t) => t.due_date && isPastDue(t.due_date) && t.status !== "Done");
    }

    if (q) {
      list = list.filter((t) => String(t.title || "").toLowerCase().includes(q));
    }

    // most recent first
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return list;
  }, [tasks, activeFilter, search, userId]);

  // Keep selection in sync with currently loaded tasks
  useEffect(() => {
    setSelectedIds((prev) => {
      if (!prev || prev.size === 0) return prev;
      const existing = new Set(tasks.map((t) => t?.id).filter(Boolean));
      const next = new Set();
      prev.forEach((id) => {
        if (existing.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [tasks]);

  const visibleIds = useMemo(() => tasksFiltered.map((t) => t.id).filter(Boolean), [tasksFiltered]);
  const selectedVisibleCount = useMemo(() => {
    if (!selectedIds || selectedIds.size === 0) return 0;
    let n = 0;
    for (const id of visibleIds) if (selectedIds.has(id)) n += 1;
    return n;
  }, [selectedIds, visibleIds]);

  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  const byStatus = useMemo(() => {
    const buckets = { "To Do": [], "In Progress": [], Done: [] };
    tasksFiltered.forEach((t) => {
      const k = buckets[t.status] ? t.status : "To Do";
      buckets[k].push(t);
    });
    return buckets;
  }, [tasksFiltered]);

  const updateStatus = async (taskId, status) => {
    setError("");
    setSuccess("");
    const existing = tasks.find((t) => t.id === taskId);
    const oldStatus = existing?.status || "";
    const taskTitle = existing?.title || "";
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to update task.");
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      setSuccess("Task updated.");

      const currentUserId = await getCurrentUserId();
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "My Tasks",
          action_name: "Changed Task Status",
          details: `Task "${taskTitle || "Untitled task"}" moved from ${oldStatus || "Unknown"} to ${status}`,
          session_id: getCurrentSessionId(),
        }),
      }).catch(() => {});
    } catch (e) {
      setError(e?.message || "Failed to update task.");
    }
  };

  const openTaskDetail = (t) => {
    if (!t?.id) return;
    try {
      window.localStorage.setItem(
        PENDING_VIEW_TASK_KEY,
        JSON.stringify({
          taskId: String(t.id),
          taskTitle: String(t.title || ""),
          fromPage: "My Tasks",
          startedAt: Date.now(),
        })
      );
    } catch {
      // ignore
    }
    router.push(`/tasks/${encodeURIComponent(t.id)}`);
  };

  const deleteTask = async (taskId) => {
    if (!taskId) {
      setError("This task is missing an id (cannot delete).");
      return;
    }
    const ok = window.confirm("Delete this task?");
    if (!ok) return;
    setError("");
    setSuccess("");
    try {
      const taskToDelete = tasks.find((t) => t.id === taskId);
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to delete task.");
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSuccess("Task deleted.");

      const currentUserId = await getCurrentUserId();
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "My Tasks",
          action_name: "Deleted Task",
          details: `Deleted task "${taskToDelete?.title || taskId}"`,
          session_id: getCurrentSessionId(),
        }),
      }).catch(() => {});
    } catch (e) {
      setError(e?.message || "Failed to delete task.");
    }
  };

  const toggleSelected = (taskId, checked) => {
    if (!taskId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(taskId);
      else next.delete(taskId);
      return next;
    });
  };

  const toggleSelectAllVisible = (checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const deleteSelected = async () => {
    const ids = Array.from(selectedIds || []);
    if (ids.length === 0) return;
    const ok = window.confirm(`Delete ${ids.length} selected task${ids.length === 1 ? "" : "s"}?`);
    if (!ok) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/tasks/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to delete selected tasks.");
      setTasks((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
      setSuccess(`Deleted ${data?.deletedCount ?? ids.length} task${(data?.deletedCount ?? ids.length) === 1 ? "" : "s"}.`);
    } catch (e) {
      setError(e?.message || "Failed to delete selected tasks.");
    }
  };

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">My Tasks</h1>
        <p className="mt-1 text-sm text-slate-500">Professional list view with filters and task detail navigation.</p>

        {error ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-slate-700">
              Assignee (for “My Tasks” filter)
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loadingUsers}
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
              >
                <option value="">Select user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role || "—"})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-slate-300 bg-white p-1">
            <button
              onClick={() => setView("list")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                view === "list" ? "bg-blue-500 text-white" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              List
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                view === "kanban" ? "bg-blue-500 text-white" : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              Kanban
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-semibold text-slate-900">Tasks</p>
          <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
            <button
              type="button"
              disabled={selectedIds.size === 0}
              onClick={deleteSelected}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              title={selectedIds.size ? `Delete ${selectedIds.size} selected` : "Select tasks to delete"}
            >
              <Trash2 size={16} />
              Delete selected{selectedIds.size ? ` (${selectedIds.size})` : ""}
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full max-w-[260px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              style={{ color: "#000000" }}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={`f-${f}`}
              onClick={() => setActiveFilter(f)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === f
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loadingTasks ? <div className="mt-3 text-sm text-slate-500">Loading...</div> : null}

        {view === "list" ? (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={(e) => toggleSelectAllVisible(e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                          aria-label="Select all visible tasks"
                        />
                        <span className="text-[11px] font-semibold tracking-wide">Select</span>
                      </div>
                    </th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Task Type</th>
                    <th className="px-4 py-3">Assignee</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Created Date</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {!loadingTasks && tasksFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-6 text-center text-slate-500">
                        No tasks found
                      </td>
                    </tr>
                  ) : (
                    tasksFiltered.map((t) => {
                      const assignee = t.assignee_id ? users.find((u) => u.id === t.assignee_id) : null;
                      const camp = t.campaign_id ? campaignsById[t.campaign_id] : null;
                      const overdue = isPastDue(t.due_date) && t.status !== "Done";
                      const checked = selectedIds.has(t.id);
                      return (
                        <tr
                          key={`row-${t.id}`}
                          className="cursor-pointer hover:bg-slate-50"
                          onClick={() => {
                            if (!t?.id) {
                              setError("This task is missing an id (cannot open).");
                              return;
                            }
                            openTaskDetail(t);
                          }}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => toggleSelected(t.id, e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-200"
                              aria-label={`Select task ${t.title || ""}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="max-w-[360px]">
                              <div className="truncate font-semibold text-slate-900" title={t.title || ""}>
                                {t.title}
                              </div>
                              {t.milestone_name ? (
                                <div className="truncate text-xs text-slate-500" title={t.milestone_name}>
                                  Milestone: {t.milestone_name}
                                </div>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700">
                              {t.task_type || "-"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            <div className="flex items-center gap-2">
                              <Avatar name={assignee?.name || "Unassigned"} imageUrl={assignee?.avatar} size="sm" />
                              <span>{assignee?.name || "Unassigned"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.Medium
                              }`}
                            >
                              {t.priority || "Medium"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                STATUS_STYLES[t.status] || STATUS_STYLES["To Do"]
                              }`}
                            >
                              {t.status || "To Do"}
                            </span>
                          </td>
                          <td className={`px-4 py-3 ${overdue ? "font-semibold text-red-700" : "text-slate-700"}`}>
                            {t.due_date ? formatDatePretty(t.due_date) : "-"}
                          </td>
                          <td className="px-4 py-3">
                            {camp?.name ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  router.push(`/campaigns/${t.campaign_id}`);
                                }}
                                className="font-semibold text-blue-600 hover:underline"
                              >
                                {camp.name}
                              </button>
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{formatDatePretty(t.created_at)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => openTaskDetail(t)}
                                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                                title="Edit"
                              >
                                <Pencil size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteTask(t.id)}
                                className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            {Object.entries(byStatus).map(([status, list]) => (
              <div key={status} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="px-1 pb-2 text-sm font-semibold text-slate-900">{status}</p>
                <div className="space-y-2">
                  {list.map((t) => {
                    const assignee = t.assignee_id ? users.find((u) => u.id === t.assignee_id) : null;
                    const camp = t.campaign_id ? campaignsById[t.campaign_id] : null;
                    const overdue = isPastDue(t.due_date) && t.status !== "Done";
                    return (
                      <article
                        key={`kb-${t.id}`}
                        onClick={() => {
                          if (!t?.id) {
                            setError("This task is missing an id (cannot open).");
                            return;
                          }
                          openTaskDetail(t);
                        }}
                        className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-sm hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              deleteTask(t?.id);
                            }}
                            className="rounded-lg border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-50"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                              PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.Medium
                            }`}
                          >
                            {t.priority || "Medium"}
                          </span>
                          <span className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700">
                            {t.task_type || "-"}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700">
                            <Avatar name={assignee?.name || "Unassigned"} imageUrl={assignee?.avatar} size="sm" />
                            {assignee?.name || "Unassigned"}
                          </span>
                          {t.milestone_name ? (
                            <span className="inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700">
                              {t.milestone_name}
                            </span>
                          ) : null}
                          {t.due_date ? (
                            <span
                              className={`inline-flex rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs ${
                                overdue ? "font-semibold text-red-700" : "text-slate-700"
                              }`}
                            >
                              Due {formatDatePretty(t.due_date)}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 text-xs text-slate-600">
                          Campaign:{" "}
                          {camp?.name ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                router.push(`/campaigns/${t.campaign_id}`);
                              }}
                              className="font-semibold text-blue-600 hover:underline"
                            >
                              {camp.name}
                            </button>
                          ) : (
                            <span>-</span>
                          )}
                        </div>

                        <div className="mt-3">
                          <StatusPipeline
                            value={t.status || "To Do"}
                            onChange={(next) => updateStatus(t.id, next)}
                            compact
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </article>
                    );
                  })}
                  {list.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                      No tasks
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

