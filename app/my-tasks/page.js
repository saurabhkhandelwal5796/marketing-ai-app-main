"use client";

import { useEffect, useMemo, useState } from "react";

const PRIORITY_STYLES = {
  Low: "border-slate-300 bg-white text-slate-700",
  Medium: "border-blue-200 bg-blue-50 text-blue-700",
  High: "border-amber-200 bg-amber-50 text-amber-800",
  Urgent: "border-red-200 bg-red-50 text-red-700",
};

const ONBOARDING = [
  { title: "Research your top 10 target companies", task_type: "Company Research", priority: "Medium" },
  { title: "Set up LinkedIn profile for outreach", task_type: "LinkedIn Post", priority: "Medium" },
  { title: "Write your first cold email template", task_type: "Cold Email Campaign", priority: "High" },
  { title: "Join the campaign planning meeting", task_type: "Generic Task", priority: "Medium" },
  { title: "Review existing campaign results", task_type: "Campaign Analysis", priority: "Medium" },
  { title: "Connect with the sales team", task_type: "Sales Coordination", priority: "Medium" },
];

function isTodayDateString(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return dateStr === `${yyyy}-${mm}-${dd}`;
}

function isTodayIso(iso) {
  if (!iso) return false;
  const d = new Date(iso);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

export default function MyTasksPage() {
  const [users, setUsers] = useState([]);
  const [userId, setUserId] = useState("");
  const [tasks, setTasks] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
        if (!userId && list[0]?.id) setUserId(list[0].id);
      } catch (e) {
        setError(e?.message || "Failed to load users.");
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTasks = async (uid) => {
    if (!uid) return;
    setLoadingTasks(true);
    setError("");
    try {
      const res = await fetch(`/api/tasks?userId=${encodeURIComponent(uid)}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load tasks.");
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (e) {
      setError(e?.message || "Failed to load tasks.");
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadTasks(userId);
  }, [userId]);

  const todaysTasks = useMemo(() => {
    return tasks.filter((t) => isTodayDateString(t.due_date) || isTodayIso(t.created_at));
  }, [tasks]);

  const byStatus = useMemo(() => {
    const buckets = { "To Do": [], "In Progress": [], Done: [] };
    tasks.forEach((t) => {
      const k = buckets[t.status] ? t.status : "To Do";
      buckets[k].push(t);
    });
    return buckets;
  }, [tasks]);

  const updateStatus = async (taskId, status) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to update task.");
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      setSuccess("Task updated.");
    } catch (e) {
      setError(e?.message || "Failed to update task.");
    }
  };

  const createOnboardingTask = async (item) => {
    if (!userId) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          description: "",
          assignee_id: userId,
          assignee_team: null,
          priority: item.priority,
          status: "To Do",
          task_type: item.task_type,
          due_date: null,
          channel_tags: [],
          campaign_context: "Onboarding",
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to create task.");
      setTasks((prev) => [data.task, ...prev]);
      setSuccess("Task created.");
    } catch (e) {
      setError(e?.message || "Failed to create task.");
    }
  };

  return (
    <main className="space-y-6 p-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">My Tasks</h1>
        <p className="mt-1 text-sm text-slate-500">Pick a user to see their assigned tasks.</p>

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

        <div className="mt-4 max-w-md">
          <label className="block text-sm font-medium text-slate-700">
            User
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={loadingUsers}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role || "—"})
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Today's Tasks</h2>
        {loadingTasks ? <div className="mt-3 text-sm text-slate-500">Loading...</div> : null}
        {!loadingTasks && todaysTasks.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">No tasks due today.</div>
        ) : null}
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {todaysTasks.map((t) => (
            <article key={`today-${t.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                  <p className="mt-1 text-sm text-slate-700">{t.campaign_context || ""}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.Medium
                      }`}
                    >
                      {t.priority}
                    </span>
                    <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700">
                      {t.task_type}
                    </span>
                    {t.due_date ? (
                      <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700">
                        Due {t.due_date}
                      </span>
                    ) : null}
                  </div>
                </div>
                <select
                  value={t.status}
                  onChange={(e) => updateStatus(t.id, e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option>To Do</option>
                  <option>In Progress</option>
                  <option>Done</option>
                </select>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">All Tasks</h2>

        {tasks.length === 0 && !loadingTasks ? (
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-900">Getting Started</p>
            <p className="mt-1 text-sm text-slate-600">
              Click an item to create a real task assigned to this user.
            </p>
            <ul className="mt-3 space-y-2">
              {ONBOARDING.map((item) => (
                <li key={item.title}>
                  <button
                    onClick={() => createOnboardingTask(item)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {Object.entries(byStatus).map(([status, list]) => (
            <div key={status} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="px-1 pb-2 text-sm font-semibold text-slate-900">{status}</p>
              <div className="space-y-2">
                {list.map((t) => (
                  <article key={`all-${t.id}`} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">{t.title}</p>
                    <p className="mt-1 text-sm text-slate-700">{t.campaign_context || ""}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          PRIORITY_STYLES[t.priority] || PRIORITY_STYLES.Medium
                        }`}
                      >
                        {t.priority}
                      </span>
                      <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700">
                        {t.task_type}
                      </span>
                      {t.due_date ? (
                        <span className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700">
                          Due {t.due_date}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-3">
                      <select
                        value={t.status}
                        onChange={(e) => updateStatus(t.id, e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      >
                        <option>To Do</option>
                        <option>In Progress</option>
                        <option>Done</option>
                      </select>
                    </div>
                  </article>
                ))}
                {list.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                    No tasks
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

