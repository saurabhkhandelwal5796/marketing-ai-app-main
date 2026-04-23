"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuditUserAndPage } from "../../../lib/useAuditPageVisit";
import { ArrowLeft, Check, ChevronDown, ChevronRight } from "lucide-react";
import Avatar from "../../../components/Avatar";

function formatDateLabel(value) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function trackerNodeStyles(status) {
  if (status === "Completed") return "border-emerald-200 bg-emerald-500 text-white";
  if (status === "In Progress") return "border-blue-200 bg-blue-500 text-white";
  if (status === "Overdue") return "border-red-200 bg-red-500 text-white";
  return "border-slate-300 bg-white text-slate-500";
}

function trackerLineStyles(status) {
  if (status === "Completed") return "bg-emerald-400";
  if (status === "In Progress") return "bg-blue-400";
  if (status === "Overdue") return "bg-red-400";
  return "bg-slate-300";
}

function statusBadgeStyles(status) {
  if (status === "Completed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "In Progress") return "border-blue-200 bg-blue-50 text-blue-700";
  if (status === "Overdue") return "border-red-200 bg-red-50 text-red-700";

  return "border-slate-300 bg-white text-slate-700";
}

function progressBarStyles(status) {
  if (status === "Completed") return "bg-emerald-500";
  if (status === "In Progress") return "bg-blue-500";
  if (status === "Overdue") return "bg-red-500";
  return "bg-slate-400";
}

export default function CampaignMilestonesPage() {
  useAuditUserAndPage("Milestones");
  const { campaignId } = useParams();
  const router = useRouter();
  
  const [milestones, setMilestones] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedMilestones, setExpandedMilestones] = useState(new Set());
  const [assigningTaskId, setAssigningTaskId] = useState("");
  const [assignmentNoticeByTaskId, setAssignmentNoticeByTaskId] = useState({});

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const [milestoneRes, userRes] = await Promise.all([fetch("/api/milestones"), fetch("/api/users")]);
        const [milestoneData, userData] = await Promise.all([milestoneRes.json(), userRes.json()]);
        if (!milestoneRes.ok || milestoneData?.error) {
          throw new Error(milestoneData?.error || "Failed to load milestones.");
        }
        if (userRes.ok && !userData?.error) {
          setUsers(Array.isArray(userData?.users) ? userData.users : []);
        }
        
        let allMilestones = Array.isArray(milestoneData?.milestones) ? milestoneData.milestones : [];
        if (campaignId === "general") {
          allMilestones = allMilestones.filter(m => !m.campaign_id);
        } else {
          allMilestones = allMilestones.filter(m => m.campaign_id === campaignId);
        }
        
        // Sort by start date or created at
        allMilestones.sort((a, b) => {
          if (a.start_date && b.start_date) return new Date(a.start_date) - new Date(b.start_date);
          return new Date(a.created_at) - new Date(b.created_at);
        });
        
        setMilestones(allMilestones);
        
        // Auto-expand the first milestone if any
        if (allMilestones.length > 0) {
          setExpandedMilestones(new Set([allMilestones[0].id]));
        }
      } catch (err) {
        setError(err?.message || "Failed to load campaign milestones.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [campaignId]);

  const toggleExpand = (id) => {
    setExpandedMilestones(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleTaskToggle = async (milestoneId, taskId, currentStatus) => {
    const newStatus = currentStatus === "Completed" ? "Not Started" : "Completed";
    
    // Optimistic update
    setMilestones(prev => prev.map(m => {
      if (m.id !== milestoneId) return m;
      
      const newTasks = m.tasks.map(t => {
        if (t.id !== taskId) return t;
        return { ...t, status: newStatus };
      });
      
      const completedCount = newTasks.filter(t => t.status === "Completed").length;
      const progress = newTasks.length > 0 ? Math.round((completedCount / newTasks.length) * 100) : 0;
      
      let status = "Not Started";
      if (completedCount === newTasks.length && newTasks.length > 0) status = "Completed";
      else if (completedCount > 0) status = "In Progress";
      // Simplified status logic for optimistic update
      
      return {
        ...m,
        tasks: newTasks,
        tasks_done: completedCount,
        progress,
        status
      };
    }));

    try {
      const res = await fetch(`/api/milestones/${milestoneId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update task");
      
      // Update with exact server values
      setMilestones(prev => prev.map(m => {
        if (m.id !== milestoneId) return m;
        return {
          ...m,
          progress: data.progress,
          status: data.status,
          tasks: m.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
        };
      }));
    } catch (err) {
      console.error(err);
      // Revert optimism if needed (ignoring for brevity, can re-fetch)
    }
  };

  const handleTaskAssign = async (milestone, taskId, assigneeId) => {
    const selectedId = assigneeId || null;
    const selectedUser = selectedId ? users.find((u) => u.id === selectedId) : null;

    setAssigningTaskId(taskId);
    setAssignmentNoticeByTaskId((prev) => ({ ...prev, [taskId]: "" }));

    // Optimistic update for immediate feedback.
    setMilestones((prev) =>
      prev.map((m) =>
        m.id !== milestone.id
          ? m
          : {
              ...m,
              tasks: (m.tasks || []).map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      assignee_id: selectedId,
                      assignee_name: selectedUser?.name || "-",
                      campaign_id: m.campaign_id || null,
                      milestone_id: m.id,
                    }
                  : t
              ),
            }
      )
    );

    try {
      const res = await fetch(`/api/milestones/${milestone.id}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignee_id: selectedId,
          milestone_id: milestone.id,
          campaign_id: milestone.campaign_id || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to assign task.");

      setMilestones((prev) =>
        prev.map((m) =>
          m.id !== milestone.id
            ? m
            : {
                ...m,
                tasks: (m.tasks || []).map((t) =>
                  t.id === taskId
                    ? {
                        ...t,
                        ...data.task,
                        campaign_id: m.campaign_id || null,
                        milestone_id: m.id,
                      }
                    : t
                ),
              }
        )
      );
      setAssignmentNoticeByTaskId((prev) => ({ ...prev, [taskId]: "Assigned" }));
      setTimeout(() => {
        setAssignmentNoticeByTaskId((prev) => ({ ...prev, [taskId]: "" }));
      }, 1200);
    } catch (err) {
      setError(err?.message || "Failed to assign task.");
    } finally {
      setAssigningTaskId("");
    }
  };

    const handleMilestoneStatusChange = async (milestoneId, newStatus) => {
    setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, status: newStatus } : m));
    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");
    } catch (err) {
      setError(err?.message || "Failed to update milestone status.");
    }
  };



  const campaignName = milestones[0]?.campaign_name && milestones[0]?.campaign_name !== "-" ? milestones[0]?.campaign_name : "General Campaign";
  const overallProgress = milestones.length > 0 ? Math.round(milestones.reduce((acc, m) => acc + (m.progress || 0), 0) / milestones.length) : 0;

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <button
          onClick={() => router.push('/milestones')}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to Milestones
        </button>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{campaignName}</h1>
              <p className="mt-2 text-sm text-slate-500">Track all milestones and tasks for this campaign.</p>
            </div>
            <div className="w-full max-w-xs">
              <div className="flex items-center justify-between text-sm font-medium text-slate-700 mb-2">
                <span>Overall Progress</span>
                <span>{overallProgress}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Loading campaign details...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 shadow-sm">
            {error}
          </div>
        ) : milestones.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            No milestones found for this campaign.
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm overflow-x-auto">
              <div className="flex min-w-max items-start justify-between gap-0">
                {milestones.map((milestone, idx) => (
                  <div key={milestone.id} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        onClick={() => router.push(`/milestones/${campaignId}/${milestone.id}`)}
                        className={`flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold shadow-sm transition-colors duration-500 cursor-pointer hover:scale-110 hover:shadow-md ${trackerNodeStyles(
                          milestone.status
                        )}`}
                      >
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                      <p className="mt-3 w-24 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 truncate" title={milestone.title}>
                        {milestone.title || "Milestone"}
                      </p>
                    </div>
                    {idx < milestones.length - 1 ? (
                      <div className={`mx-4 mt-0 h-1 w-24 rounded-full transition-colors duration-500 ${trackerLineStyles(milestone.status)}`} />
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              {milestones.map((milestone, idx) => {
                const isExpanded = expandedMilestones.has(milestone.id);
                return (
                  <div key={milestone.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all">
                    {/* <button
                      onClick={() => toggleExpand(milestone.id)}
                      className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-slate-50"
                    > */}
                        <div
                            onClick={() => toggleExpand(milestone.id)}
                            className="flex w-full cursor-pointer items-center justify-between gap-4 p-5 text-left hover:bg-slate-50"
                          >

                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                          {String(idx + 1).padStart(2, "0")}
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{milestone.title}</h3>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                            <span>{formatDateLabel(milestone.start_date)} - {formatDateLabel(milestone.end_date)}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1.5">
                              <Avatar name={milestone.assignee_name || "Unassigned"} imageUrl={milestone.assignee_avatar} size="sm" />
                              {milestone.assignee_name || "Unassigned"}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="hidden sm:block w-32">
                          <div className="flex items-center justify-between text-xs font-medium text-slate-600 mb-1.5">
                            <span>{milestone.progress}%</span>
                            <span>{milestone.tasks_done}/{milestone.task_count} tasks</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${progressBarStyles(milestone.status)}`}
                              style={{ width: `${milestone.progress}%` }}
                            />
                          </div>
                        </div>
                        {/* <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${statusBadgeStyles(milestone.status)}`}>
                          {milestone.status}
                        </span> */}
<select
  value={milestone.status}
  onClick={(e) => e.stopPropagation()}
  onChange={(e) => {
    e.stopPropagation();
    handleMilestoneStatusChange(milestone.id, e.target.value);
  }}
  className={`shrink-0 cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold outline-none ${statusBadgeStyles(milestone.status)}`}
>
  <option value="Not Started">Not Started</option>
  <option value="In Progress">In Progress</option>
  <option value="Completed">Completed</option>
</select>


                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(milestone.id);
                          }}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {isExpanded ? "Hide Detail" : "View in Detail"}
                        </button>
                        <div className="text-slate-400">
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                      </div>
                    {/* </button> */}
                   </div>


                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50/50 p-5">
                        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Title</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{milestone.title || "-"}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Assignee</p>
                            <p className="mt-1 text-sm text-slate-700">{milestone.assignee_name || "Unassigned"}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Start Date</p>
                            <p className="mt-1 text-sm text-slate-700">{formatDateLabel(milestone.start_date)}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Due Date</p>
                            <p className="mt-1 text-sm text-slate-700">{formatDateLabel(milestone.end_date)}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Status</p>
                            <p className="mt-1 text-sm text-slate-700">{milestone.status || "Not Started"}</p>
                          </div>
                          <div className="rounded-xl border border-slate-200 bg-white p-3 md:col-span-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Description</p>
                            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{milestone.description || "-"}</p>
                          </div>
                        </div>

                        {(!milestone.tasks || milestone.tasks.length === 0) ? (
                          <p className="text-sm text-slate-500 text-center py-4">No tasks in this milestone.</p>
                        ) : (
                          <div className="space-y-3">
                            {milestone.tasks.map(task => {
                              const isCompleted = task.status === "Completed";
                              return (
                                <div
                                  key={task.id}
                                  className={`flex items-center gap-4 rounded-xl border p-4 transition-colors ${
                                    isCompleted ? "border-emerald-200 bg-emerald-50/30" : "border-slate-200 bg-white hover:border-blue-300"
                                  }`}
                                >
                                  
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium truncate transition-colors ${isCompleted ? "text-slate-500 line-through" : "text-slate-900"}`}>
                                      {task.title}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                        {task.task_type}
                                      </span>
                                      <span className="text-[11px] text-slate-500">
                                        {task.assignee_name !== "-" ? task.assignee_name : "Unassigned"}
                                      </span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                      <select
                                        value={task.assignee_id || ""}
                                        onChange={(e) => handleTaskAssign(milestone, task.id, e.target.value)}
                                        disabled={assigningTaskId === task.id}
                                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                                      >
                                        <option value="">Unassigned</option>
                                        {users.map((u) => (
                                          <option key={u.id} value={u.id}>
                                            {u.name}
                                          </option>
                                        ))}
                                      </select>
                                      {assignmentNoticeByTaskId[task.id] ? (
                                        <span className="text-[11px] font-semibold text-emerald-600">
                                          {assignmentNoticeByTaskId[task.id]}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
