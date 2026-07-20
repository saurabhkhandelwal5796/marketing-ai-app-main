import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../lib/authSession";

const MIN_PAGE_VISIT_MS = 10_000;

function localDayBounds(dateParam) {
  const now = new Date();
  const base = dateParam
    ? new Date(`${String(dateParam).slice(0, 10)}T12:00:00`)
    : now;
  if (Number.isNaN(base.getTime())) {
    const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const e = new Date(s);
    e.setDate(e.getDate() + 1);
    return { startIso: s.toISOString(), endIso: e.toISOString() };
  }
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function countMapInc(map, key, by = 1) {
  const k = key || "(unknown)";
  map.set(k, (map.get(k) || 0) + by);
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await req.json();
    console.log("AUDIT API HIT", body);
    console.log("[api/audit] received", body);
    const sessionUserId = String(session.id);
    const bodyUserId = String(body?.user_id || "");
    if (bodyUserId && bodyUserId !== sessionUserId) {
      console.warn("[api/audit] user mismatch (using session user)", { bodyUserId, sessionUserId });
    }

    const event_type = String(body?.event_type || "").trim();
    if (!event_type) return NextResponse.json({ error: "event_type required." }, { status: 400 });

    const row = {
      user_id: sessionUserId,
      event_type,
      page_name: String(body?.page_name ?? ""),
      action_name: body?.action_name != null ? String(body.action_name) : null,
      details: body?.details != null ? String(body.details) : null,
      time_spent_ms: body?.time_spent_ms != null ? Number(body.time_spent_ms) : null,
      session_id: body?.session_id != null ? String(body.session_id) : null,
      created_at: body?.created_at ? String(body.created_at) : new Date().toISOString(),
    };

    if (row.time_spent_ms != null && !Number.isFinite(row.time_spent_ms)) row.time_spent_ms = null;
    if (row.event_type === "page_visit" && row.time_spent_ms != null && row.time_spent_ms < MIN_PAGE_VISIT_MS) {
      // Ignore accidental clicks / short tab switches.
      return NextResponse.json({ ok: true, skipped: true });
    }

    const supabase = getSupabaseServerClient();
    const cutoffIso = new Date(Date.now() - 60_000).toISOString();

    let dedupeQuery = supabase
      .from("audit_logs")
      .select("id,time_spent_ms,session_id")
      .eq("user_id", row.user_id)
      .eq("page_name", row.page_name)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(1);

    if (row.event_type === "page_visit") {
      if (row.session_id) dedupeQuery = dedupeQuery.eq("session_id", row.session_id);
      dedupeQuery = dedupeQuery.eq("event_type", "page_visit");
      dedupeQuery = dedupeQuery.is("action_name", null);
    } else {
      dedupeQuery = dedupeQuery.eq("event_type", row.event_type);
      if (row.action_name) dedupeQuery = dedupeQuery.eq("action_name", row.action_name);
      else dedupeQuery = dedupeQuery.is("action_name", null);
    }

    const { data: existingRow, error: dedupeErr } = await dedupeQuery.maybeSingle();
    if (dedupeErr) {
      console.error("[api/audit] dedupe check failed", dedupeErr);
      return NextResponse.json({ error: dedupeErr.message || "Audit dedupe failed." }, { status: 500 });
    }

    if (existingRow?.id) {
      const updatePatch = {
        details: row.details,
        session_id: row.session_id,
      };
      if (row.event_type === "page_visit") {
        const prevMs = Number(existingRow.time_spent_ms || 0);
        const nextMs = Number(row.time_spent_ms || 0);
        updatePatch.time_spent_ms = Math.max(prevMs, nextMs);
      } else if (row.time_spent_ms != null) {
        updatePatch.time_spent_ms = row.time_spent_ms;
      }
      const { data: updated, error: updateErr } = await supabase
        .from("audit_logs")
        .update(updatePatch)
        .eq("id", existingRow.id)
        .select("id")
        .maybeSingle();
      if (updateErr) {
        console.error("[api/audit] supabase update failed", updateErr);
        return NextResponse.json({ error: updateErr.message || "Supabase update failed." }, { status: 500 });
      }
      console.log("[api/audit] deduped and updated", { id: updated?.id || existingRow.id, event_type: row.event_type, page_name: row.page_name });
      return NextResponse.json({ ok: true, id: updated?.id || existingRow.id, deduped: true });
    }

    const { data, error } = await supabase.from("audit_logs").insert(row).select("id").maybeSingle();
    if (error) {
      console.error("[api/audit] supabase insert failed", error);
      return NextResponse.json({ error: error.message || "Supabase insert failed." }, { status: 500 });
    }
    console.log("[api/audit] saved", { id: data?.id, event_type: row.event_type, page_name: row.page_name });

    return NextResponse.json({ ok: true, id: data?.id || null });
  } catch (e) {
    console.error("[api/audit] handler error", e);
    return NextResponse.json({ error: e?.message || "Audit insert failed." }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const summary = searchParams.get("summary") === "1" || searchParams.get("summary") === "true";
    const daysParamRaw = String(searchParams.get("days") || "").trim();
    const daysParam = daysParamRaw ? Math.max(1, Math.min(90, Number(daysParamRaw))) : null;
    const dateParam = searchParams.get("date");
    const { startIso, endIso } = localDayBounds(dateParam || null);

    const filterUserId = String(searchParams.get("userId") || "").trim();
    const filterPage = String(searchParams.get("page") || "").trim();
    const filterEvent = String(searchParams.get("eventType") || "").trim();
    const limit = Math.min(200, Math.max(1, Number(searchParams.get("limit") || "40")));
    const offset = Math.max(0, Number(searchParams.get("offset") || "0"));

    const supabase = getSupabaseServerClient();
    const isAdmin = !!session.is_admin;

    if (summary) {
      let q = supabase
        .from("audit_logs")
        .select(
          "id,user_id,event_type,page_name,action_name,details,time_spent_ms,session_id,created_at"
        )
        .order("created_at", { ascending: false });

      if (daysParam) {
        const cutoff = new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000).toISOString();
        q = q.gte("created_at", cutoff);
      } else {
        q = q.gte("created_at", startIso).lt("created_at", endIso);
      }

      if (!isAdmin) q = q.eq("user_id", session.id);
      else if (filterUserId) q = q.eq("user_id", filterUserId);
      if (filterPage) q = q.eq("page_name", filterPage);
      if (filterEvent === "auth") q = q.in("event_type", ["login", "logout"]);
      else if (filterEvent) q = q.eq("event_type", filterEvent);

      const { data: logs, error: logsErr } = await q.limit(20000);
      if (logsErr) throw new Error(logsErr.message);

      const rows = Array.isArray(logs) ? logs : [];

      const distinctSessions = new Set(
        rows.map((r) => r.session_id).filter(Boolean)
      ).size;

      const eventsByUser = new Map();
      const visitsByPage = new Map();
      let totalActions = 0;
      for (const r of rows) {
        if (r.event_type === "action") totalActions += 1;
        if (r.user_id) countMapInc(eventsByUser, r.user_id, 1);
        if (r.event_type === "page_visit" && r.page_name) countMapInc(visitsByPage, r.page_name, 1);
      }

      let mostActiveUserId = null;
      let mostActiveCount = 0;
      for (const [uid, c] of eventsByUser) {
        if (c > mostActiveCount) {
          mostActiveCount = c;
          mostActiveUserId = uid;
        }
      }

      let mostVisitedPage = "—";
      let mostVisitedCount = 0;
      for (const [p, c] of visitsByPage) {
        if (c > mostVisitedCount) {
          mostVisitedCount = c;
          mostVisitedPage = p;
        }
      }

      const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
      let userMap = new Map();
      if (userIds.length) {
        const { data: users } = await supabase
          .from("users")
          .select("id,name,email,role,avatar,is_admin")
          .in("id", userIds);
        for (const u of users || []) userMap.set(u.id, u);
      }

      const mostActiveUser = mostActiveUserId ? userMap.get(mostActiveUserId) : null;

      /** @type {Map<string, any>} */
      const perUser = new Map();
      for (const r of rows) {
        const uid = r.user_id;
        if (!uid) continue;
        if (!perUser.has(uid)) {
          perUser.set(uid, {
            user_id: uid,
            lastSeen: r.created_at,
            timeMs: 0,
            pageCounts: new Map(),
            actionCount: 0,
          });
        }
        const u = perUser.get(uid);
        if (r.created_at > u.lastSeen) u.lastSeen = r.created_at;
        if (r.event_type === "page_visit" && r.time_spent_ms != null && r.time_spent_ms > 0) {
          u.timeMs += r.time_spent_ms;
        }
        if (r.event_type === "page_visit" && r.page_name) countMapInc(u.pageCounts, r.page_name, 1);
        if (r.event_type === "action") u.actionCount += 1;
      }

      const userSummaries = [];
      for (const [uid, u] of perUser) {
        const info = userMap.get(uid) || { id: uid, name: "User", email: "", role: "", avatar: null };
        let topPage = "—";
        let topPageN = 0;
        for (const [p, c] of u.pageCounts) {
          if (c > topPageN) {
            topPageN = c;
            topPage = p;
          }
        }
        const top3 = [...u.pageCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, count]) => ({ name, count }));
        userSummaries.push({
          user: info,
          lastSeen: u.lastSeen,
          timeSpentMsToday: u.timeMs,
          mostUsedPage: topPage,
          actionsToday: u.actionCount,
          topPages: top3,
        });
      }
      userSummaries.sort((a, b) => String(b.lastSeen).localeCompare(String(a.lastSeen)));

      const pageStats = new Map();
      for (const r of rows) {
        if (r.event_type !== "page_visit" || !r.page_name) continue;
        if (!pageStats.has(r.page_name)) {
          pageStats.set(r.page_name, { visits: 0, timeSum: 0, timeN: 0, userCounts: new Map() });
        }
        const ps = pageStats.get(r.page_name);
        ps.visits += 1;
        if (r.user_id) countMapInc(ps.userCounts, r.user_id, 1);
        if (r.time_spent_ms != null && r.time_spent_ms > 0) {
          ps.timeSum += r.time_spent_ms;
          ps.timeN += 1;
        }
      }

      const pageAnalytics = [];
      for (const [pageName, ps] of pageStats) {
        let topUserId = null;
        let topUserN = 0;
        for (const [uid, c] of ps.userCounts) {
          if (c > topUserN) {
            topUserN = c;
            topUserId = uid;
          }
        }
        const topUser = topUserId ? userMap.get(topUserId) : null;
        pageAnalytics.push({
          pageName,
          totalVisits: ps.visits,
          avgTimeSpentMs: ps.timeN ? Math.round(ps.timeSum / ps.timeN) : 0,
          topUser: topUser ? { name: topUser.name, id: topUser.id } : null,
        });
      }
      pageAnalytics.sort((a, b) => b.totalVisits - a.totalVisits);

      return NextResponse.json({
        dateRange: { start: startIso, end: endIso },
        stats: {
          totalSessionsToday: distinctSessions,
          mostActiveUser: mostActiveUser
            ? { id: mostActiveUser.id, name: mostActiveUser.name, role: mostActiveUser.role }
            : null,
          mostVisitedPage: mostVisitedPage !== "—" ? mostVisitedPage : null,
          mostVisitedCount,
          totalActionsToday: totalActions,
        },
        userSummaries,
        pageAnalytics,
      });
    }

    let listQ = supabase
      .from("audit_logs")
      .select(
        "id,user_id,event_type,page_name,action_name,details,time_spent_ms,session_id,created_at",
        { count: "exact" }
      )
      .order("created_at", { ascending: false });

    if (!isAdmin) listQ = listQ.eq("user_id", session.id);
    else if (filterUserId) listQ = listQ.eq("user_id", filterUserId);

    if (filterPage) listQ = listQ.eq("page_name", filterPage);
    if (filterEvent === "auth") listQ = listQ.in("event_type", ["login", "logout"]);
    else if (filterEvent) listQ = listQ.eq("event_type", filterEvent);

    const dateFilter = searchParams.get("date");
    if (daysParam) {
      const cutoff = new Date(Date.now() - daysParam * 24 * 60 * 60 * 1000).toISOString();
      listQ = listQ.gte("created_at", cutoff);
    } else if (dateFilter) {
      listQ = listQ.gte("created_at", startIso).lt("created_at", endIso);
    }

    listQ = listQ.range(offset, offset + limit - 1);

    const { data: listRows, error: listErr, count } = await listQ;

    if (listErr) throw new Error(listErr.message);

    const ids = [...new Set((listRows || []).map((r) => r.user_id).filter(Boolean))];
    let usersById = new Map();
    if (ids.length) {
      const { data: users } = await supabase
        .from("users")
        .select("id,name,email,role,avatar,is_admin")
        .in("id", ids);
      for (const u of users || []) usersById.set(u.id, u);
    }

    const records = (listRows || []).map((r) => ({
      ...r,
      user: usersById.get(r.user_id) || null,
    }));

    const total = count ?? null;
    const hasMore = total != null ? offset + records.length < total : records.length === limit;

    return NextResponse.json({ records, hasMore, total });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Audit fetch failed." }, { status: 500 });
  }
}
