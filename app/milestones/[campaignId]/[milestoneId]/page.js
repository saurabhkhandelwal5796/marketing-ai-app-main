"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuditUserAndPage } from "../../../../lib/useAuditPageVisit";
import { ArrowLeft, Check, Trash2, Plus, Save, Send } from "lucide-react";

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDateLabel(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function statusBadgeStyles(status) {
  if (status === "Completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "In Progress") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "Overdue") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-300 bg-slate-100 text-slate-700";
}

function progressBarColor(status) {
  if (status === "Completed") return "bg-emerald-500";
  if (status === "In Progress") return "bg-blue-500";
  if (status === "Overdue") return "bg-red-500";
  return "bg-slate-400";
}

const STATUSES = ["Not Started", "In Progress", "Completed"];
const TASK_TYPES = [
  "Generic Task",
  "Company Research",
  "LinkedIn Post",
  "Social Media Post",
  "Blog Post",
  "Marketing Video",
  "Cold Email Campaign",
  "Email Newsletter",
  "Campaign Analysis",
  "Sales Coordination",
  "Research",
  "Outreach",
  "Content",
  "Review",
  "Approval",
  "Analysis",
  "Operations",
  "Planning",
];

export default function MilestoneDetailPage() {
  useAuditUserAndPage("Milestones");
  const { campaignId, milestoneId } = useParams();
  const router = useRouter();

  const [milestone, setMilestone] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState("");
  const [activityLog, setActivityLog] = useState([]);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [status, setStatus] = useState("Not Started");

  // New task form
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskType, setNewTaskType] = useState("Generic Task");

  const saveTimeoutRef = useRef(null);
  const isInitialLoad = useRef(true);

  const addLog = useCallback((message) => {
    const now = new Date();
    const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    setActivityLog((prev) => [{ message, time }, ...prev].slice(0, 20));
  }, []);

  // Load milestone data + users
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [milestonesRes, usersRes] = await Promise.all([
          fetch("/api/milestones"),
          fetch("/api/users"),
        ]);
        const milestonesData = await milestonesRes.json();
        const usersData = await usersRes.json();

        if (!milestonesRes.ok) throw new Error(milestonesData?.error || "Failed to load milestones.");
        if (usersRes.ok && Array.isArray(usersData?.users)) setUsers(usersData.users);

        const all = Array.isArray(milestonesData?.milestones) ? milestonesData.milestones : [];
        const found = all.find((m) => m.id === milestoneId);
        if (!found) throw new Error("Milestone not found.");

        setMilestone(found);
        setTitle(found.title || "");
        setDescription(found.description || "");
        setStartDate(found.start_date || "");
        setEndDate(found.end_date || "");
        setAssigneeId(found.assignee_id || "");
        setStatus(found.status || "Not Started");
        setTasks(Array.isArray(found.tasks) ? found.tasks : []);
      } catch (err) {
        setError(err?.message || "Failed to load milestone.");
      } finally {
        setLoading(false);
        // Mark initial load as complete after a brief delay
        setTimeout(() => { isInitialLoad.current = false; }, 500);
      }
    };
    load();
  }, [milestoneId]);

  // Auto-save milestone fields (debounced)
  const autoSaveMilestone = useCallback(
    (fieldsToSave, logMessage) => {
      if (isInitialLoad.current) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        setSavedIndicator("");
        try {
          const res = await fetch(`/api/milestones/${milestoneId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(fieldsToSave),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data?.error || "Save failed");
          setSavedIndicator("Saved");
          if (logMessage) addLog(logMessage);
          setTimeout(() => setSavedIndicator(""), 2000);
        } catch (err) {
          setSavedIndicator("Save failed");
          setTimeout(() => setSavedIndicator(""), 3000);
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [milestoneId, addLog]
  );

  // Field change handlers with auto-save
  const handleTitleChange = (val) => {
    setTitle(val);
    autoSaveMilestone({ title: val }, "Title changed");
  };
  const handleDescriptionChange = (val) => {
    setDescription(val);
    autoSaveMilestone({ description: val }, "Description updated");
  };
  const handleStartDateChange = (val) => {
    setStartDate(val);
    autoSaveMilestone({ start_date: val }, "Start date changed");
  };
  const handleEndDateChange = (val) => {
    setEndDate(val);
    autoSaveMilestone({ end_date: val }, "End date changed");
  };
  const handleAssigneeChange = (val) => {
    setAssigneeId(val);
    const userName = users.find((u) => u.id === val)?.name || "Unknown";
    autoSaveMilestone({ assignee_id: val || null }, `Assignee updated to ${userName}`);
  };

  // Task checkbox toggle
  const handleTaskToggle = async (taskId, currentStatus) => {
    const newStatus = currentStatus === "Completed" ? "Not Started" : "Completed";

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      const res = await fetch(`/api/milestones/${milestoneId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update task");
      setStatus(data.status);
      setMilestone((prev) => prev ? { ...prev, progress: data.progress, status: data.status } : prev);
      addLog(`Task marked as ${newStatus}`);
    } catch (err) {
      // Revert
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentStatus } : t))
      );
    }
  };

  // Delete task
  const handleDeleteTask = async (taskId) => {
    const removed = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));

    try {
      const res = await fetch(`/api/milestones/tasks/${taskId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete task");
      addLog(`Task "${removed?.title || ""}" deleted`);

      // Refresh milestone data to get updated progress
      const milestonesRes = await fetch("/api/milestones");
      const milestonesData = await milestonesRes.json();
      if (milestonesRes.ok) {
        const all = Array.isArray(milestonesData?.milestones) ? milestonesData.milestones : [];
        const found = all.find((m) => m.id === milestoneId);
        if (found) {
          setMilestone(found);
          setStatus(found.status);
          setTasks(Array.isArray(found.tasks) ? found.tasks : []);
        }
      }
    } catch (err) {
      if (removed) setTasks((prev) => [...prev, removed]);
    }
  };

  // Add task
  const handleAddTask = async () => {
    const taskTitle = newTaskTitle.trim();
    if (!taskTitle) return;

    try {
      const res = await fetch(`/api/milestones/${milestoneId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          task_type: newTaskType,
          assignee_id: assigneeId || null,
          status: "Not Started",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add task");

      setTasks((prev) => [...prev, data.task]);
      setNewTaskTitle("");
      setNewTaskType("Generic Task");
      addLog(`Task "${taskTitle}" added`);

      if (data.status) setStatus(data.status);
      if (typeof data.progress === "number") {
        setMilestone((prev) => prev ? { ...prev, progress: data.progress, status: data.status } : prev);
      }
    } catch (err) {
      setError(err?.message || "Failed to add task");
    }
  };

  // Manual save all button
  const handleSaveAll = async () => {
    setSaving(true);
    setSavedIndicator("");
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          start_date: startDate,
          end_date: endDate,
          assignee_id: assigneeId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Save failed");
      setSavedIndicator("All changes saved");
      addLog("All changes saved");
      setTimeout(() => setSavedIndicator(""), 2500);
    } catch (err) {
      setSavedIndicator("Save failed");
      setTimeout(() => setSavedIndicator(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const completedCount = tasks.filter((t) => t.status === "Completed").length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
            Loading milestone...
          </div>
        </div>
      </main>
    );
  }

  if (error && !milestone) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <button
            onClick={() => router.push(`/milestones/${campaignId}`)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Campaign
          </button>
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 shadow-sm">
            {error}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.push(`/milestones/${campaignId}`)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Campaign
        </button>

        {/* Header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-2xl font-semibold text-slate-900 bg-transparent border-none outline-none focus:ring-0 p-0 placeholder-slate-400"
                placeholder="Milestone title..."
              />
              <p className="mt-2 text-sm text-slate-500">
                {milestone?.campaign_name || "General Campaign"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Save indicator */}
              {savedIndicator && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full transition-opacity ${
                    savedIndicator === "Save failed"
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {savedIndicator}
                </span>
              )}
              {saving && (
                <span className="text-xs text-slate-400 animate-pulse">Saving...</span>
              )}

              {/* Status badge dropdown */}
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  addLog(`Status changed to ${e.target.value}`);
                }}
                className={`appearance-none rounded-full border px-3 py-1 text-xs font-semibold outline-none cursor-pointer ${statusBadgeStyles(status)}`}
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              {/* Save button */}
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
              <span>Progress</span>
              <span>{progress}% — {completedCount}/{tasks.length} tasks done</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressBarColor(status)}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </section>

        {/* Details Grid */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleEndDateChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>
        </section>

        {/* Description */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</label>
          <textarea
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            rows={4}
            className="mt-3 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Add a description for this milestone..."
          />
        </section>

        {/* Tasks */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">Tasks</h3>
              <p className="text-xs text-slate-400 mt-0.5">{completedCount}/{tasks.length} completed</p>
            </div>
          </div>

          {tasks.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">No tasks yet. Add one below.</p>
          )}

          <div className="space-y-3">
            {tasks.map((task) => {
              const isCompleted = task.status === "Completed";
              return (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                    isCompleted
                      ? "border-emerald-200 bg-emerald-50/30"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  {/* Checkbox */}
                  <label className="relative flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={isCompleted}
                      onChange={() => handleTaskToggle(task.id, task.status)}
                    />
                    <div
                      className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                        isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-slate-300 bg-white text-transparent peer-focus:ring-2 peer-focus:ring-blue-500/30"
                      }`}
                    >
                      <Check size={14} strokeWidth={3} />
                    </div>
                  </label>

                  {/* Task content */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium transition-colors ${
                        isCompleted ? "text-slate-400 line-through" : "text-slate-900"
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {task.task_type || "Generic Task"}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {task.assignee_name && task.assignee_name !== "-"
                          ? task.assignee_name
                          : "Unassigned"}
                      </span>
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                    title="Delete task"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add task */}
          <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Add Task Manually</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTask();
                }}
              />
              <select
                value={newTaskType}
                onChange={(e) => setNewTaskType(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {TASK_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleAddTask}
              disabled={!newTaskTitle.trim()}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={14} />
              Add Task
            </button>
          </div>
        </section>

        {/* Activity Log */}
        {activityLog.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Activity Log
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {activityLog.map((entry, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                    {entry.time}
                  </span>
                  <span className="text-slate-700">{entry.message}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
