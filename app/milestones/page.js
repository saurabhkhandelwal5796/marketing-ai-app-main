"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";

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

export default function MilestonesPage() {
  const router = useRouter();
  const [milestones, setMilestones] = useState([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [pageError, setPageError] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("name");
  const [selectedCampaignIds, setSelectedCampaignIds] = useState(() => new Set());

  useEffect(() => {
    const loadMilestones = async () => {
      setLoadingMilestones(true);
      setPageError("");
      try {
        const res = await fetch("/api/milestones");
        const data = await res.json();
        if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load milestones.");
        setMilestones(Array.isArray(data?.milestones) ? data.milestones : []);
      } catch (error) {
        setPageError(error?.message || "Failed to load milestones.");
      } finally {
        setLoadingMilestones(false);
      }
    };
    loadMilestones();
  }, []);

  const overallStats = useMemo(() => [
    { label: "Total Milestones", value: milestones.length, tone: "text-slate-900" },
    { label: "Completed", value: milestones.filter((item) => item.status === "Completed").length, tone: "text-emerald-600" },
    { label: "In Progress", value: milestones.filter((item) => item.status === "In Progress").length, tone: "text-blue-600" },
    { label: "Not Started", value: milestones.filter((item) => item.status === "Not Started").length, tone: "text-slate-600" },
  ], [milestones]);

  const campaignGroups = useMemo(() => {
    const groups = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const milestone of milestones) {
      const cid = milestone.campaign_id || "general";
      if (!groups[cid]) {
        groups[cid] = {
          id: cid,
          name: milestone.campaign_name && milestone.campaign_name !== "-" ? milestone.campaign_name : "General",
          milestones: [],
          assignees: new Map(),
          startDates: [],
          endDates: [],
          statusCounts: { "Completed": 0, "In Progress": 0, "Not Started": 0, "Overdue": 0 },
          totalProgress: 0,
          latestCreatedAt: 0,
        };
      }
      
      const group = groups[cid];
      group.milestones.push(milestone);
      group.statusCounts[milestone.status] = (group.statusCounts[milestone.status] || 0) + 1;
      group.totalProgress += milestone.progress || 0;
      group.latestCreatedAt = Math.max(group.latestCreatedAt, new Date(milestone.created_at || 0).getTime() || 0);
      
      if (milestone.assignee_id) {
        group.assignees.set(milestone.assignee_id, {
          name: milestone.assignee_name,
          avatar: milestone.assignee_avatar
        });
      }
      if (milestone.start_date) group.startDates.push(new Date(`${milestone.start_date}T00:00:00`).getTime());
      if (milestone.end_date) group.endDates.push(new Date(`${milestone.end_date}T00:00:00`).getTime());
    }

    const query = search.toLowerCase();

    let rows = Object.values(groups).map(g => {
      const avgProgress = g.milestones.length ? Math.round(g.totalProgress / g.milestones.length) : 0;
      const minDate = g.startDates.length ? new Date(Math.min(...g.startDates)).toISOString().split("T")[0] : null;
      const maxDate = g.endDates.length ? new Date(Math.max(...g.endDates)).toISOString().split("T")[0] : null;
      const dueDateTs = maxDate ? new Date(`${maxDate}T00:00:00`).getTime() : 0;
      const isOverdue = !!maxDate && dueDateTs < today.getTime() && avgProgress < 100;
      
      return {
        ...g,
        avgProgress,
        minDate,
        maxDate,
        uniqueAssignees: Array.from(g.assignees.values()).slice(0, 3),
        dueDateTs,
        isOverdue,
      };
    }).filter(g => !search || g.name.toLowerCase().includes(query));

    rows.sort((a, b) => {
      if (sortBy === "progress") return (b.avgProgress || 0) - (a.avgProgress || 0);
      if (sortBy === "due_date") return (a.dueDateTs || Number.MAX_SAFE_INTEGER) - (b.dueDateTs || Number.MAX_SAFE_INTEGER);
      if (sortBy === "recent") return (b.latestCreatedAt || 0) - (a.latestCreatedAt || 0);
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
    return rows;
  }, [milestones, search, sortBy]);

  useEffect(() => {
    setSelectedCampaignIds((prev) => {
      if (!prev.size) return prev;
      const visible = new Set(campaignGroups.map((g) => g.id));
      const next = new Set();
      prev.forEach((id) => {
        if (visible.has(id)) next.add(id);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [campaignGroups]);

  const toggleCampaignSelected = (campaignId, checked) => {
    setSelectedCampaignIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(campaignId);
      else next.delete(campaignId);
      return next;
    });
  };

  const selectedCampaigns = useMemo(
    () => campaignGroups.filter((g) => selectedCampaignIds.has(g.id)),
    [campaignGroups, selectedCampaignIds]
  );

  const exportSelected = () => {
    if (!selectedCampaigns.length) return;
    const lines = [
      ["Campaign Name", "Milestones Count", "Progress", "Date Range", "Overdue"].join(","),
      ...selectedCampaigns.map((g) =>
        [
          `"${String(g.name || "").replaceAll('"', '""')}"`,
          g.milestones.length,
          `${g.avgProgress}%`,
          `"${formatDateLabel(g.minDate)} to ${formatDateLabel(g.maxDate)}"`,
          g.isOverdue ? "Yes" : "No",
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `selected-campaigns-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteSelected = async () => {
    if (!selectedCampaigns.length) return;
    const ok = window.confirm(`Delete ${selectedCampaigns.length} selected campaign group(s) milestones?`);
    if (!ok) return;
    setPageError("");
    try {
      const idsToDelete = selectedCampaigns.flatMap((g) => g.milestones.map((m) => m.id).filter(Boolean));
      await Promise.all(idsToDelete.map((id) => fetch(`/api/milestones/${id}`, { method: "DELETE" })));
      setMilestones((prev) => prev.filter((m) => !idsToDelete.includes(m.id)));
      setSelectedCampaignIds(new Set());
    } catch (e) {
      setPageError(e?.message || "Failed to delete selected campaigns.");
    }
  };

  const markAllAsComplete = async () => {
    if (!selectedCampaigns.length) return;
    setPageError("");
    try {
      const calls = [];
      selectedCampaigns.forEach((g) => {
        g.milestones.forEach((m) => {
          (m.tasks || []).forEach((t) => {
            if (t?.id && t.status !== "Completed") {
              calls.push(
                fetch(`/api/milestones/${m.id}/tasks/${t.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ status: "Completed" }),
                })
              );
            }
          });
        });
      });
      await Promise.all(calls);
      // Reload to get recomputed progress/status from server
      const res = await fetch("/api/milestones");
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to refresh milestones.");
      setMilestones(Array.isArray(data?.milestones) ? data.milestones : []);
      setSelectedCampaignIds(new Set());
    } catch (e) {
      setPageError(e?.message || "Failed to mark selected campaigns complete.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Milestones</h1>
            <p className="mt-2 text-sm text-slate-500">Track milestone progress grouped by campaign.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Download size={16} />
              Export
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Create Campaign
            </button>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {overallStats.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className={`mt-3 text-3xl font-semibold ${card.tone}`}>{card.value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {pageError ? (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
              {pageError}
            </div>
          ) : null}
          
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-xl font-semibold text-slate-900">Campaigns</h2>
            <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:w-auto">
              <div className="relative w-full max-w-sm">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Search campaigns..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="name">Sort by: Name</option>
                <option value="progress">Sort by: Progress</option>
                <option value="due_date">Sort by: Due Date</option>
                <option value="recent">Sort by: Most Recent</option>
              </select>
              <div className="inline-flex items-center rounded-xl border border-slate-300 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "grid" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          <div className={viewMode === "grid" ? "grid grid-cols-1 gap-6 md:grid-cols-2" : "space-y-2"}>
            {loadingMilestones ? (
              <div className="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">Loading campaigns...</div>
            ) : null}
            {!loadingMilestones && campaignGroups.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                {milestones.length === 0
                  ? "No milestones yet."
                  : "No campaigns match the current search."}
              </div>
            ) : null}

            {viewMode === "grid"
              ? campaignGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => router.push(`/milestones/${group.id}`)}
                    className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-500 hover:shadow-md"
                  >
                    <div className="absolute left-4 top-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedCampaignIds.has(group.id)}
                        onChange={(e) => toggleCampaignSelected(group.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                    </div>
                    <div className="pl-6">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-2 font-semibold text-slate-900">{group.name}</h3>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                          {group.milestones.length} Milestones
                        </span>
                      </div>
                      {group.isOverdue ? (
                        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                          Overdue
                        </div>
                      ) : null}
                      <div className="mt-4 flex gap-2">
                        {group.statusCounts["Completed"] > 0 && (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            {group.statusCounts["Completed"]} Completed
                          </span>
                        )}
                        {group.statusCounts["In Progress"] > 0 && (
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            {group.statusCounts["In Progress"]} In Progress
                          </span>
                        )}
                        {group.statusCounts["Not Started"] > 0 && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            {group.statusCounts["Not Started"]} Not Started
                          </span>
                        )}
                      </div>
                      <div className="mt-6">
                        <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                          <span>Overall Progress</span>
                          <span className="font-semibold text-slate-900">{group.avgProgress}%</span>
                        </div>
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${group.avgProgress}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                      <div className="flex -space-x-2">
                        {group.uniqueAssignees.map((user, i) => (
                          <div key={i} className="group/avatar relative">
                            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[10px] font-semibold text-white shadow-sm">
                              {user.avatar || initials(user.name)}
                            </div>
                            <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover/avatar:block">
                              {user.name}
                            </div>
                          </div>
                        ))}
                        {group.assignees.size === 0 && <span className="text-xs text-slate-400">Unassigned</span>}
                      </div>
                      <div className="text-right text-xs font-medium text-slate-500">
                        {formatDateLabel(group.minDate)} <br />
                        to {formatDateLabel(group.maxDate)}
                      </div>
                    </div>
                  </div>
                ))
              : (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <div className="grid grid-cols-[40px_2fr_100px_180px_180px_140px_170px_140px] bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                    <span />
                    <span>Campaign Name</span>
                    <span>Milestones</span>
                    <span>Progress</span>
                    <span>Status</span>
                    <span>Assignees</span>
                    <span>Date Range</span>
                    <span>Actions</span>
                  </div>
                  {campaignGroups.map((group) => (
                    <div
                      key={group.id}
                      className="grid grid-cols-[40px_2fr_100px_180px_180px_140px_170px_140px] items-center border-t border-slate-200 bg-white px-3 py-3 text-sm hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCampaignIds.has(group.id)}
                        onChange={(e) => toggleCampaignSelected(group.id, e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600"
                      />
                      <div>
                        <p className="font-semibold text-slate-900">{group.name}</p>
                        {group.isOverdue ? (
                          <span className="mt-1 inline-flex rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            Overdue
                          </span>
                        ) : null}
                      </div>
                      <span className="text-slate-700">{group.milestones.length}</span>
                      <div>
                        <div className="mb-1 text-xs font-semibold text-slate-700">{group.avgProgress}%</div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${group.avgProgress}%` }} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {group.statusCounts["Completed"] > 0 ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">{group.statusCounts["Completed"]} C</span> : null}
                        {group.statusCounts["In Progress"] > 0 ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">{group.statusCounts["In Progress"]} IP</span> : null}
                        {group.statusCounts["Not Started"] > 0 ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{group.statusCounts["Not Started"]} NS</span> : null}
                      </div>
                      <div className="flex -space-x-2">
                        {group.uniqueAssignees.map((user, i) => (
                          <div key={i} className="group/avatar relative">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[9px] font-semibold text-white">
                              {user.avatar || initials(user.name)}
                            </div>
                            <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover/avatar:block">
                              {user.name}
                            </div>
                          </div>
                        ))}
                        {group.assignees.size === 0 ? <span className="text-xs text-slate-400">Unassigned</span> : null}
                      </div>
                      <span className="text-xs text-slate-600">
                        {formatDateLabel(group.minDate)} to {formatDateLabel(group.maxDate)}
                      </span>
                      <button
                        type="button"
                        onClick={() => router.push(`/milestones/${group.id}`)}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Open
                      </button>
                    </div>
                  ))}
                </div>
                )}
          </div>
        </section>
        {selectedCampaignIds.size > 0 ? (
          <div className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
            <span className="text-sm font-semibold text-slate-800">{selectedCampaignIds.size} campaigns selected</span>
            <button
              type="button"
              onClick={exportSelected}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Export Selected
            </button>
            <button
              type="button"
              onClick={deleteSelected}
              className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Delete Selected
            </button>
            <button
              type="button"
              onClick={markAllAsComplete}
              className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Mark all as Complete
            </button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
