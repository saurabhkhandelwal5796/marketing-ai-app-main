import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../lib/authSession";

const ALLOWED_FIELDS = new Set([
  "title",
  "description",
  "assignee_id",
  "assignee_team",
  "priority",
  "status",
  "task_type",
  "due_date",
  "channel_tags",
  "campaign_context",
  "campaign_id",
]);

export async function GET(_req, { params }) {
  try {
    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing task id." }, { status: 400 });

    const { data, error } = await supabase
      .from("tasks")
      .select(
        "id,title,description,assignee_id,assignee_team,priority,status,task_type,due_date,channel_tags,campaign_context,campaign_id,created_at"
      )
      .eq("id", id)
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ task: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch task." }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing task id." }, { status: 400 });

    const body = await req.json();
    const patch = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (!ALLOWED_FIELDS.has(k)) continue;
      patch[k] = v;
    }

    let query = supabase
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .select(
        "id,title,description,assignee_id,assignee_team,priority,status,task_type,due_date,channel_tags,campaign_context,campaign_id,created_at"
      )
      .single();
    if (!session.is_admin) query = query.eq("assignee_id", session.id);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ task: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to update task." }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing task id." }, { status: 400 });

    let query = supabase.from("tasks").delete().eq("id", id);
    if (!session.is_admin) query = query.eq("assignee_id", session.id);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete task." }, { status: 500 });
  }
}

