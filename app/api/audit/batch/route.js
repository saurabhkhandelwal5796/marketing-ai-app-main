import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../lib/authSession";

const MIN_PAGE_VISIT_MS = 10_000;

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await req.json();
    const events = Array.isArray(body?.events) ? body.events : [];
    if (!events.length) return NextResponse.json({ ok: true, inserted: 0 });

    const sessionUserId = String(session.id);

    const rows = events
      .map((e) => ({
        user_id: sessionUserId,
        event_type: String(e?.event_type || "").trim(),
        page_name: String(e?.page_name ?? ""),
        action_name: e?.action_name != null ? String(e.action_name) : null,
        details: e?.details != null ? String(e.details) : null,
        time_spent_ms: e?.time_spent_ms != null ? Number(e.time_spent_ms) : null,
        session_id: e?.session_id != null ? String(e.session_id) : null,
        created_at: e?.created_at ? String(e.created_at) : new Date().toISOString(),
      }))
      .filter((r) => r.event_type);

    const filtered = rows.filter((r) => {
      if (r.time_spent_ms != null && !Number.isFinite(r.time_spent_ms)) r.time_spent_ms = null;
      if (r.event_type === "page_visit" && r.time_spent_ms != null && r.time_spent_ms < MIN_PAGE_VISIT_MS) return false;
      return true;
    });

    if (!filtered.length) return NextResponse.json({ ok: true, inserted: 0, skipped: rows.length });

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("audit_logs").insert(filtered);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, inserted: filtered.length, skipped: rows.length - filtered.length });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Audit batch insert failed." }, { status: 500 });
  }
}

