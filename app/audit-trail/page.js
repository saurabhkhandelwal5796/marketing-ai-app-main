"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Download, X } from "lucide-react";
import { getCurrentSessionId, getCurrentUserId } from "../../lib/getCurrentUserId";
import Avatar from "../../components/Avatar";

function ymdLocal(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMs(ms) {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

function formatTimelineWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  const timeStr = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today at ${timeStr}`;
  if (isYesterday) return `Yesterday at ${timeStr}`;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatExactWhen(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function describeLog(row) {
  const page = row.page_name || "—";
  if (row.event_type === "login") return "Logged In";
  if (row.event_type === "logout") return "Logged Out";
  if (row.event_type === "action" && row.action_name) return row.action_name;
  if (row.event_type === "page_visit") {
    return `Time on ${page}`;
  }
  return row.event_type || "Event";
}

function toReadableLabel(key) {
  const normalized = String(key || "")
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim();
  return normalized
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function parseDetails(details) {
  const raw = String(details || "").trim();
  if (!raw) return [];
  if (!raw.startsWith("{")) return [raw];
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [raw];
    return Object.entries(obj).map(([k, v]) => `${toReadableLabel(k)}: ${String(v ?? "—")}`);
  } catch {
    return [raw];
  }
}

const EVENT_TYPES = [
  { value: "", label: "All" },
  { value: "page_visit", label: "Page visits" },
  { value: "action", label: "Actions" },
  { value: "auth", label: "Login/Logout" },
];

const PAGE_PRESETS = [
  "",
  "Dashboard",
  "Campaigns",
  "Campaign — Marketing Plan",
  "Campaign — Selected Marketing Plans",
  "Campaign — Task Assignment",
  "Campaign — Target Audience",
  "Milestones",
  "My Tasks",
  "Users",
  "Audit Trail",
  "Create & Post",
  "Auth",
  "App",
];

export default function AuditTrailPage() {
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
              page_name: "Audit Trail",
              time_spent_ms: timeSpent,
              details: `Spent ${Math.round(timeSpent / 1000)} seconds on Audit Trail page`,
              session_id: getCurrentSessionId(),
            }),
          }).catch(() => {});
        })();
      }
    };
  }, []);

  const [sessionUser, setSessionUser] = useState(null);
  const [summaryDate, setSummaryDate] = useState(() => ymdLocal());
  const [statsPayload, setStatsPayload] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  const [filterUserId, setFilterUserId] = useState("");
  const [filterPage, setFilterPage] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [dateMode, setDateMode] = useState("today"); // today | 7 | 30 | custom
  const [customDate, setCustomDate] = useState(() => ymdLocal());

  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState("");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalLogs, setTotalLogs] = useState(0);
  const timelineRef = useRef(null);

  const [allUsers, setAllUsers] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [popupPos, setPopupPos] = useState({ top: 0, left: 0 });
  const popupRef = useRef(null);

  const limit = 20;

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (m) setSessionUser(data?.user || null);
      } catch {
        if (m) setSessionUser(null);
      }
    })();
    return () => {
      m = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionUser?.is_admin) return;
    let m = true;
    (async () => {
      try {
        const res = await fetch("/api/users?pageSize=50&page=1");
        const data = await res.json();
        if (!m) return;
        if (res.ok && !data?.error) setAllUsers(Array.isArray(data.users) ? data.users : []);
      } catch {
        if (m) setAllUsers([]);
      }
    })();
    return () => {
      m = false;
    };
  }, [sessionUser?.is_admin]);

  const loadSummary = useCallback(async () => {
    setStatsLoading(true);
    setStatsError("");
    try {
      const params = new URLSearchParams({ summary: "1", date: summaryDate });
      const res = await fetch(`/api/audit?${params}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load summary.");
      setStatsPayload(data);
    } catch (e) {
      setStatsError(e?.message || "Failed to load summary.");
      setStatsPayload(null);
    } finally {
      setStatsLoading(false);
    }
  }, [summaryDate]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const fetchTimeline = useCallback(
    async (nextOffset, append) => {
      const params = new URLSearchParams({ limit: String(limit), offset: String(nextOffset) });
      if (filterUserId) params.set("userId", filterUserId);
      if (filterPage) params.set("page", filterPage);
      if (filterEvent) params.set("eventType", filterEvent);
      if (dateMode === "today") params.set("days", "1");
      else if (dateMode === "7") params.set("days", "7");
      else if (dateMode === "30") params.set("days", "30");
      else if (dateMode === "custom") params.set("date", customDate);

      const res = await fetch(`/api/audit?${params}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Failed to load activity.");
      const rows = Array.isArray(data.records) ? data.records : [];
      if (append) setTimeline((prev) => [...prev, ...rows]);
      else setTimeline(rows);
      setHasMore(!!data.hasMore);
      setOffset(nextOffset + rows.length);
      setTotalLogs(Number(data?.total || 0));
    },
    [customDate, dateMode, filterUserId, filterPage, filterEvent]
  );

  const reloadTimeline = useCallback(async () => {
    setTimelineLoading(true);
    setTimelineError("");
    setOffset(0);
    try {
      await fetchTimeline(0, false);
    } catch (e) {
      setTimelineError(e?.message || "Failed to load activity.");
      setTimeline([]);
      setHasMore(false);
    } finally {
      setTimelineLoading(false);
    }
  }, [fetchTimeline]);

  useEffect(() => {
    reloadTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateMode, customDate, filterUserId, filterPage, filterEvent]);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      if (!hasMore || loadingMore || timelineLoading) return;
      if (el.scrollHeight - el.scrollTop - el.clientHeight < 160) {
        setLoadingMore(true);
        fetchTimeline(offset, true)
          .catch((e) => setTimelineError(e?.message || "Failed to load more activity."))
          .finally(() => setLoadingMore(false));
      }
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [fetchTimeline, hasMore, loadingMore, offset, timelineLoading]);

  useEffect(() => {
    const onDown = (event) => {
      if (!selectedLog) return;
      if (popupRef.current && popupRef.current.contains(event.target)) return;
      setSelectedLog(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [selectedLog]);

  const exportCsv = useCallback(async () => {
    const buildParams = (lim, off) => {
      const p = new URLSearchParams({ limit: String(lim), offset: String(off) });
      if (filterUserId) p.set("userId", filterUserId);
      if (filterPage) p.set("page", filterPage);
      if (filterEvent) p.set("eventType", filterEvent);
      if (dateMode === "today") p.set("days", "1");
      else if (dateMode === "7") p.set("days", "7");
      else if (dateMode === "30") p.set("days", "30");
      else if (dateMode === "custom") p.set("date", customDate);
      return p;
    };

    const rows = [];
    let off = 0;
    const lim = 200;
    for (let i = 0; i < 100; i += 1) {
      const res = await fetch(`/api/audit?${buildParams(lim, off)}`);
      const data = await res.json();
      if (!res.ok || data?.error) throw new Error(data?.error || "Export failed.");
      const batch = Array.isArray(data.records) ? data.records : [];
      rows.push(...batch);
      off += batch.length;
      if (!data.hasMore || batch.length === 0) break;
    }

    const esc = (v) => {
      const s = String(v ?? "");
      const needs = /[",\n]/.test(s);
      const inner = s.replace(/"/g, "\"\"");
      return needs ? `"${inner}"` : inner;
    };

    const header = [
      "id",
      "user_id",
      "user_name",
      "event_type",
      "page_name",
      "action_name",
      "details",
      "time_spent_ms",
      "session_id",
      "created_at",
    ];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.user_id,
          r.user?.name || "",
          r.event_type,
          r.page_name,
          r.action_name || "",
          r.details || "",
          r.time_spent_ms ?? "",
          r.session_id || "",
          r.created_at,
        ]
          .map(esc)
          .join(",")
      );
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-trail-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [customDate, dateMode, filterEvent, filterPage, filterUserId]);

  const pageOptions = useMemo(() => {
    const fromStats = (statsPayload?.pageAnalytics || []).map((p) => p.pageName).filter(Boolean);
    const set = new Set([...PAGE_PRESETS.filter(Boolean), ...fromStats]);
    return ["", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [statsPayload]);

  const chartData = useMemo(() => {
    const rows = statsPayload?.pageAnalytics || [];
    return rows.slice(0, 8).map((r) => ({
      name: r.pageName.length > 18 ? `${r.pageName.slice(0, 16)}…` : r.pageName,
      full: r.pageName,
      visits: r.totalVisits,
      avgMs: r.avgTimeSpentMs,
    }));
  }, [statsPayload]);

  const statCards = statsPayload?.stats;

  return (
    <main className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Audit Trail</h1>
        <p className="mt-1 text-sm text-slate-500">Session activity, page visits, and key actions across the app.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-xs font-medium text-slate-600">
            Summary date
            <input
              type="date"
              value={summaryDate}
              onChange={(e) => setSummaryDate(e.target.value)}
              className="ml-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={loadSummary}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh summary
          </button>
        </div>
      </div>

      {statsError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{statsError}</div>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total sessions today</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {statsLoading ? "…" : statCards?.totalSessionsToday ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Most active user</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {statsLoading ? "…" : statCards?.mostActiveUser?.name || "—"}
          </p>
          {statCards?.mostActiveUser?.role ? (
            <p className="text-xs text-slate-500">{statCards.mostActiveUser.role}</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Most visited page</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">
            {statsLoading ? "…" : statCards?.mostVisitedPage || "—"}
          </p>
          {statCards?.mostVisitedCount != null ? (
            <p className="text-xs text-slate-500">{statCards.mostVisitedCount} visits</p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total actions today</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {statsLoading ? "…" : statCards?.totalActionsToday ?? 0}
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">User activity summary</h2>
        {statsLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !(statsPayload?.userSummaries || []).length ? (
          <p className="text-sm text-slate-500">No activity for this date.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {(statsPayload.userSummaries || []).map((row) => (
              <div key={row.user.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <Avatar name={row.user.name} imageUrl={row.user.avatar} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">{row.user.name}</p>
                    <p className="text-xs text-slate-500">{row.user.role || "User"}</p>
                    <p className="mt-2 text-xs text-slate-600">
                      Last seen: {formatTimelineWhen(row.lastSeen)}
                    </p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Time today</dt>
                    <dd className="font-medium text-slate-900">{formatMs(row.timeSpentMsToday)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Top page</dt>
                    <dd className="truncate font-medium text-slate-900" title={row.mostUsedPage}>
                      {row.mostUsedPage}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Actions today</dt>
                    <dd className="font-medium text-slate-900">{row.actionsToday}</dd>
                  </div>
                </dl>
                <div className="mt-3">
                  <p className="text-xs font-medium text-slate-500">Top pages</p>
                  <div className="mt-1 flex h-2 overflow-hidden rounded-full bg-slate-100">
                    {(() => {
                      const parts = row.topPages || [];
                      const sum = parts.reduce((s, p) => s + p.count, 0) || 1;
                      return parts.map((p, i) => {
                        const pct = Math.round((p.count / sum) * 100);
                        const hue = [221, 139, 91][i % 3];
                        return (
                          <div
                            key={`${p.name}-${i}`}
                            title={`${p.name}: ${p.count}`}
                            className="h-full"
                            style={{ width: `${pct}%`, backgroundColor: `hsl(${hue}, 70%, 45%)` }}
                          />
                        );
                      });
                    })()}
                  </div>
                  <ul className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-600">
                    {(row.topPages || []).map((p) => (
                      <li key={p.name}>
                        {p.name} ({p.count})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Activity timeline</h2>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            {sessionUser?.is_admin ? (
              <label className="text-xs font-medium text-slate-600">
                User
                <select
                  value={filterUserId}
                  onChange={(e) => setFilterUserId(e.target.value)}
                  className="ml-2 mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">All users</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="text-xs font-medium text-slate-600">
                User
                <select disabled className="ml-2 mt-1 block rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-500">
                  <option>Current user</option>
                </select>
              </label>
            )}
          <label className="text-xs font-medium text-slate-600">
            Page
            <select
              value={filterPage}
              onChange={(e) => setFilterPage(e.target.value)}
              className="ml-2 mt-1 block max-w-[220px] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {pageOptions.map((p) => (
                <option key={p || "all"} value={p}>
                  {p || "All pages"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Date
            <select
              value={dateMode}
              onChange={(e) => setDateMode(e.target.value)}
              className="ml-2 mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              <option value="today">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="custom">Custom</option>
            </select>
          </label>
          {dateMode === "custom" ? (
            <label className="text-xs font-medium text-slate-600">
              Day
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="ml-2 mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
              />
            </label>
          ) : null}
          <label className="text-xs font-medium text-slate-600">
            Event type
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="ml-2 mt-1 block rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {EVENT_TYPES.map((o) => (
                <option key={o.value || "all"} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          </div>
          <button
            type="button"
            onClick={() => exportCsv().catch((e) => setTimelineError(e?.message || "Export failed."))}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>

        {timelineError ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{timelineError}</div>
        ) : null}

        <p className="mb-3 text-sm text-slate-600">
          Showing <span className="font-semibold text-slate-900">{timeline.length}</span> of{" "}
          <span className="font-semibold text-slate-900">{totalLogs}</span> total logs
        </p>

        {timelineLoading ? (
          <p className="text-sm text-slate-500">Loading timeline…</p>
        ) : timeline.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
            No activity found for selected filters
          </div>
        ) : (
          <div
            ref={timelineRef}
            className="audit-scroll relative h-[500px] overflow-y-auto rounded-xl border border-slate-200"
          >
            <ul className="divide-y divide-slate-100">
              {timeline.map((row, idx) => {
                const u = row.user;
                return (
                  <li
                    key={`${row.id}-${row.created_at}-${idx}`}
                    className="flex cursor-pointer flex-wrap items-start gap-3 px-4 py-4 hover:bg-slate-50"
                    onClick={(e) => {
                      const nextTop = e.currentTarget.offsetTop + 8;
                      const nextLeft = 12;
                      setPopupPos({ top: nextTop, left: nextLeft });
                      setSelectedLog(row);
                    }}
                  >
                    <Avatar name={u?.name || "User"} imageUrl={u?.avatar} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{u?.name || "User"}</p>
                        <span className="text-xs text-slate-500">{formatTimelineWhen(row.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-800">{describeLog(row)}</p>
                      {row.details ? <p className="mt-1 text-xs text-slate-500">{row.details}</p> : null}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {row.page_name || "—"}
                        </span>
                        {row.event_type === "page_visit" && row.time_spent_ms > 0 ? (
                          <span className="text-xs text-slate-500">{formatMs(row.time_spent_ms)}</span>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="px-4 py-3 text-center text-xs text-slate-500">
              {loadingMore ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                  Loading more…
                </span>
              ) : hasMore ? (
                "Scroll to load more"
              ) : (
                "No more records"
              )}
            </div>
            {selectedLog ? (
              <div
                ref={popupRef}
                className="absolute z-30 w-[320px] rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
                style={{ top: popupPos.top, left: popupPos.left }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900">{describeLog(selectedLog)}</h4>
                  <button
                    type="button"
                    onClick={() => setSelectedLog(null)}
                    className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Avatar name={selectedLog.user?.name || "User"} imageUrl={selectedLog.user?.avatar} size="sm" />
                  <p className="text-sm text-slate-700">
                    <span className="font-medium text-slate-900">Who:</span> {selectedLog.user?.name || "User"}
                  </p>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">When:</span> {formatExactWhen(selectedLog.created_at)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">Page:</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                    {selectedLog.page_name || "—"}
                  </span>
                  {selectedLog.event_type === "page_visit" && selectedLog.time_spent_ms > 0 ? (
                    <span className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">Duration:</span> {formatMs(selectedLog.time_spent_ms)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">What changed</p>
                  {parseDetails(selectedLog.details).length ? (
                    <div className="mt-1 space-y-1">
                      {parseDetails(selectedLog.details).map((line, idx) => (
                        <p key={`${line}-${idx}`} className="text-sm text-slate-800">
                          {line}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-slate-800">No additional details provided.</p>
                  )}
                </div>

                <p className="mt-3 text-[11px] text-slate-400">Session ID: {selectedLog.session_id || "—"}</p>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <style jsx global>{`
        .audit-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .audit-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .audit-scroll::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.35);
          border-radius: 999px;
        }
        .audit-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.55);
        }
      `}</style>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Page analytics</h2>
        {statsLoading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : !chartData.length ? (
          <p className="text-sm text-slate-500">No page visit data for this date.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value, name, props) => [value, name === "visits" ? "Visits" : name]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.full || ""}
                  />
                  <Bar dataKey="visits" fill="#4f46e5" radius={[4, 4, 0, 0]} name="visits" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-2">Page</th>
                    <th className="py-2 pr-2">Visits</th>
                    <th className="py-2 pr-2">Avg time</th>
                    <th className="py-2">Top user</th>
                  </tr>
                </thead>
                <tbody>
                  {(statsPayload?.pageAnalytics || []).map((r) => (
                    <tr key={r.pageName} className="border-b border-slate-100">
                      <td className="py-2 pr-2 font-medium text-slate-900">{r.pageName}</td>
                      <td className="py-2 pr-2">{r.totalVisits}</td>
                      <td className="py-2 pr-2">{formatMs(r.avgTimeSpentMs)}</td>
                      <td className="py-2">{r.topUser?.name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
