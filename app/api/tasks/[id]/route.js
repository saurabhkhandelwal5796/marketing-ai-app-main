import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

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
]);

export async function PATCH(req, { params }) {
  try {
    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing task id." }, { status: 400 });

    const body = await req.json();
    const patch = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (!ALLOWED_FIELDS.has(k)) continue;
      patch[k] = v;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", id)
      .select(
        "id,title,description,assignee_id,assignee_team,priority,status,task_type,due_date,channel_tags,campaign_context,created_at"
      )
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ task: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to update task." }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing task id." }, { status: 400 });

    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete task." }, { status: 500 });
  }
}

