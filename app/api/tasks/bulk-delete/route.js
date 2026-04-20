import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getAuditSessionId } from "../../../../lib/auditTracker";

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const body = await req.json();
    const idsRaw = body?.ids;

    if (!Array.isArray(idsRaw)) {
      return NextResponse.json({ error: "ids must be an array." }, { status: 400 });
    }

    const ids = Array.from(
      new Set(
        idsRaw
          .map((x) => (typeof x === "string" ? x.trim() : ""))
          .filter((x) => x.length > 0)
      )
    );

    if (ids.length === 0) {
      return NextResponse.json({ error: "No valid task ids provided." }, { status: 400 });
    }

    // Guardrail to avoid accidentally deleting too much at once
    if (ids.length > 500) {
      return NextResponse.json({ error: "Too many task ids (max 500)." }, { status: 400 });
    }

    const { error } = await supabase.from("tasks").delete().in("id", ids);
    if (error) throw new Error(error.message);

    // Track bulk task deletion in audit log
    try {
      const sessionId = getAuditSessionId();
      await supabase.from("audit_logs").insert({
        user_id: session.id,
        event_type: "action",
        page_name: "My Tasks",
        action_name: "Bulk Deleted Tasks",
        details: JSON.stringify({ taskIds: ids, count: ids.length }),
        session_id: sessionId,
      });
    } catch (auditErr) {
      // eslint-disable-next-line no-console
      console.error("[audit] task bulk deletion log failed", auditErr);
    }

    return NextResponse.json({ ok: true, deletedCount: ids.length });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete tasks." }, { status: 500 });
  }
}

