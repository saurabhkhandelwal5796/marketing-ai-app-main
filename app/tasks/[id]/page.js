"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ThinkingDisplay from "../../../components/ThinkingDisplay";
import { getCurrentSessionId, getCurrentUserId } from "../../../lib/getCurrentUserId";

const PENDING_VIEW_TASK_KEY = "audit.pendingViewedTask";

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const TASK_TYPES = [
  "Generic Task",
  "LinkedIn Post",
  "Social Media Post",
  "Blog Post",
  "Marketing Video",
  "Cold Email Campaign",
  "Company Research",
  "Email Newsletter",
  "Campaign Analysis",
  "Sales Coordination",
];
const STATUS_STEPS = ["To Do", "In Progress", "Done"];

function StatusPipeline({ value, onChange }) {
  const currentIndex = STATUS_STEPS.indexOf(value);
  const activeIdx = currentIndex >= 0 ? currentIndex : 0;

  return (
    <div className="flex flex-wrap items-center gap-1 text-xs w-full">
      {STATUS_STEPS.map((step, idx) => {
        const isCurrent = idx === activeIdx;
        const isCompleted = activeIdx === STATUS_STEPS.length - 1 ? true : idx < activeIdx;
        const classes = isCurrent
          ? "bg-blue-600 text-white border-blue-600"
          : isCompleted
          ? "bg-emerald-600 text-white border-emerald-600"
          : "bg-slate-100 text-slate-500 border-slate-300";

        return (
          <div key={step} className="flex min-w-[90px] flex-1 items-center gap-1">
            <button
              type="button"
              onClick={() => onChange(step)}
              className={`w-full rounded-full border px-3 py-1.5 text-center font-semibold transition hover:opacity-90 ${classes}`}
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

function todayYmd() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function TaskDetailPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [task, setTask] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingToast, setSavingToast] = useState("");
  const [error, setError] = useState("");

  const [guideLoading, setGuideLoading] = useState(false);
  const [guideText, setGuideText] = useState("");
  const [dueReason, setDueReason] = useState("");

  // Next.js passes params as a Promise in this version.
  const resolvedParams = use(params);
  const taskId = decodeURIComponent(resolvedParams?.id || "");
  const returnTo = String(searchParams.get("returnTo") || "").trim();

  const assignee = useMemo(() => {
    if (!task?.assignee_id) return null;
    return users.find((u) => u.id === task.assignee_id) || null;
  }, [task?.assignee_id, users]);

  const showSaved = () => {
    setSavingToast("Saved");
    setTimeout(() => setSavingToast(""), 1500);
  };

  const patch = async (patchBody) => {
    if (!taskId) return;
    setError("");
    try {
      const prevStatus = task?.status || "";
      
      const apiEndpoint = `/api/tasks/${encodeURIComponent(taskId)}`;
      
      const res = await fetch(apiEndpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to save.");
      setTask(data.task);
      showSaved();

      if (patchBody && Object.prototype.hasOwnProperty.call(patchBody, "status")) {
        const nextStatus = String(patchBody.status || "");
        if (nextStatus && nextStatus !== prevStatus) {
          const currentUserId = await getCurrentUserId();
          fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: currentUserId || "anonymous",
              event_type: "action",
              page_name: "My Tasks",
              action_name: "Changed Task Status",
              details: `Task "${String(data?.task?.title || task?.title || "Untitled task")}" moved from ${prevStatus || "Unknown"} to ${nextStatus}`,
              session_id: getCurrentSessionId(),
            }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      setError(e?.message || "Failed to save.");
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      if (!taskId || taskId === "undefined") {
        setTask(null);
        setError("Missing task id.");
        setLoading(false);
        return;
      }
      try {
        // Check if this is a milestone task
        const isMilestoneTask = taskId.startsWith('milestone:');
        let taskRes;
        
        // if (isMilestoneTask) {
        //   // For milestone tasks, we need to parse the milestone ID and task ID
        //   const [milestoneId, actualTaskId] = taskId.replace('milestone:', '').split('/');
        //   taskRes = await fetch(`/api/milestones/${encodeURIComponent(milestoneId)}/tasks/${encodeURIComponent(actualTaskId)}`);
        // } else {
        //   // Regular task
        //   taskRes = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`);
        // }
        // AFTER
        taskRes = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`);

        
        // const [taskData, userRes] = await Promise.all([taskRes, fetch("/api/users")]);
        // const taskResult = await taskRes.json();
        // const userData = await userRes.json();
        const userRes = await fetch("/api/users");
        const taskResult = await taskRes.json();
        const userData = await userRes.json();
        const taskData = taskRes;

        
        if (!taskData.ok || taskResult?.error) throw new Error(taskResult?.error || "Failed to load task.");
        if (!userRes.ok || userData?.error) throw new Error(userData?.error || "Failed to load users.");
        setTask(taskResult.task);
        setUsers(Array.isArray(userData.users) ? userData.users : []);
      } catch (e) {
        setError(e?.message || "Failed to load.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [taskId]);

  useEffect(() => {
    if (!taskId) return undefined;
    let timer = null;
    try {
      const raw = window.localStorage.getItem(PENDING_VIEW_TASK_KEY);
      if (!raw) return undefined;
      const pending = JSON.parse(raw);
      if (!pending || String(pending.taskId || "") !== String(taskId)) return undefined;
      const title = String(pending.taskTitle || task?.title || "");
      const startedAt = Number(pending.startedAt || 0);
      if (!startedAt) return undefined;

      const remaining = Math.max(0, 10_000 - (Date.now() - startedAt));
      timer = window.setTimeout(() => {
        getCurrentUserId().then((currentUserId) => {
          fetch("/api/audit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: currentUserId || "anonymous",
              event_type: "action",
              page_name: "My Tasks",
              action_name: "Viewed Task",
              details: `Viewed task "${title || "Untitled task"}" for at least 10 seconds`,
              session_id: getCurrentSessionId(),
            }),
          }).catch(() => {});
        });
        try {
          window.localStorage.removeItem(PENDING_VIEW_TASK_KEY);
        } catch {
          // ignore
        }
      }, remaining);
    } catch {
      // ignore
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [taskId, task?.title]);

  const suggestDueDate = async () => {
    if (!task) return;
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "due_date_suggest",
          today: todayYmd(),
          title: task.title,
          taskType: task.task_type,
          priority: task.priority,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to suggest due date.");
      setDueReason(data.reason || "");
      await patch({ due_date: data.suggested_date || null });
    } catch (e) {
      setError(e?.message || "Failed to suggest due date.");
    }
  };

  const parseGuide = (text) => {
    const headers = [
      "WHAT THIS TASK MEANS",
      "WHAT YOU NEED BEFORE STARTING",
      "STEP-BY-STEP INSTRUCTIONS",
      "PRO TIPS",
      "HOW TO KNOW YOU ARE DONE",
    ];
    const lines = String(text || "").split("\n");
    const sections = [];
    let current = null;
    const flush = () => {
      if (current) sections.push(current);
      current = null;
    };
    for (const line of lines) {
      const trimmed = line.trim();
      const isHeader = headers.includes(trimmed) || (trimmed && /^[A-Z0-9][A-Z0-9 \+\-]{6,}$/.test(trimmed));
      if (isHeader && trimmed === trimmed.toUpperCase()) {
        flush();
        current = { title: trimmed, body: "" };
      } else {
        if (!current) current = { title: "GUIDE", body: "" };
        current.body += (current.body ? "\n" : "") + line;
      }
    }
    flush();
    // Bonus section = any section after the required 5 headers
    const main = [];
    const bonus = [];
    for (const s of sections) {
      if (headers.includes(s.title)) main.push(s);
      else bonus.push(s);
    }
    return { main, bonus };
  };

  const generateGuide = async () => {
    if (!task) return;
    setGuideLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "task_guide",
          task,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to generate guide.");
      setGuideText(data.guide || "");

      const currentUserId = await getCurrentUserId();
      fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: currentUserId || "anonymous",
          event_type: "action",
          page_name: "My Tasks",
          action_name: "Asked AI Suggestion",
          details: `Requested AI suggestion for task "${String(task.title || "Untitled task")}"`,
          session_id: getCurrentSessionId(),
        }),
      }).catch(() => {});
    } catch (e) {
      setError(e?.message || "Failed to generate guide.");
    } finally {
      setGuideLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading task...
        </div>
      </main>
    );
  }

  if (!task) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error || "Task not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => {
            if (returnTo) router.push(returnTo);
            else router.back();
          }}
          className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          ← Back to Tasks
        </button>
        {savingToast ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            {savingToast}
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="space-y-4 lg:col-span-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <input
              value={task.title || ""}
              onChange={(e) => setTask((prev) => ({ ...prev, title: e.target.value }))}
              onBlur={() => patch({ title: task.title })}
              className="w-full rounded-xl border border-slate-300 px-3 py-3 text-lg font-semibold text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusPipeline value={task.status || "To Do"} onChange={(next) => patch({ status: next })} />
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-700">Priority</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    key={`prio-${p}`}
                    type="button"
                    onClick={() => patch({ priority: p })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      task.priority === p
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-700">Task Type</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TASK_TYPES.map((tt) => (
                  <button
                    key={`type-${tt}`}
                    type="button"
                    onClick={() => patch({ task_type: tt })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      task.task_type === tt
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                  >
                    {tt}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-700">Description</p>
              <textarea
                value={task.description || ""}
                onChange={(e) => setTask((prev) => ({ ...prev, description: e.target.value }))}
                onBlur={() => patch({ description: task.description })}
                rows={4}
                className="mt-1 w-full resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {Array.isArray(task.channel_tags) && task.channel_tags.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-700">Channel Tags</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {task.channel_tags.map((tag) => (
                    <span
                      key={`tag-${tag}`}
                      className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-700">Campaign Context</p>
              <div className="mt-1 whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {task.campaign_context || "—"}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-900">Details</p>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-700">Assignee</p>
                <select
                  value={task.assignee_id || ""}
                  onChange={(e) => patch({ assignee_id: e.target.value || null, assignee_team: null })}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.avatar || ""} {u.name} — {u.role || "—"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">Due Date</p>
                  <button
                    onClick={suggestDueDate}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    AI Suggest
                  </button>
                </div>
                <input
                  type="date"
                  value={task.due_date || ""}
                  onChange={(e) => patch({ due_date: e.target.value || null })}
                  className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
                />
                {dueReason ? <p className="mt-1 text-xs italic text-slate-500">{dueReason}</p> : null}
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="text-xs font-semibold text-slate-700">Task ID</p>
                <p className="mt-1 break-all">{taskId}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="text-xs font-semibold text-slate-700">Created Date</p>
                <p className="mt-1">{task.created_at}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">✦ AI Task Guide</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateGuide}
                  className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  {guideText ? "Regenerate" : "Generate Guide"}
                </button>
              </div>
            </div>
            <div className="mt-3">
              {guideLoading ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                  <ThinkingDisplay preset="general" />
                </div>
              ) : null}
              {guideText ? (
                <div className="space-y-3">
                  {(() => {
                    const { main, bonus } = parseGuide(guideText);
                    return (
                      <>
                        {main.map((s) => (
                          <div key={s.title} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">
                              {s.title}
                            </div>
                            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {s.body.trim()}
                            </div>
                          </div>
                        ))}
                        {bonus.map((s) => (
                          <div key={`bonus-${s.title}`} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">
                              {s.title}
                            </div>
                            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold text-slate-700">Copy-ready</p>
                                <button
                                  onClick={() => navigator.clipboard.writeText(String(s.body || "").trim())}
                                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Copy
                                </button>
                              </div>
                              <pre className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                {String(s.body || "").trim()}
                              </pre>
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

