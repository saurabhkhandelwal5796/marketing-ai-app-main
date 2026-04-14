import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../lib/authSession";

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    let query = supabase
      .from("tasks")
      .select(
        "id,title,description,assignee_id,assignee_team,priority,status,task_type,due_date,channel_tags,campaign_context,created_at"
      )
      .order("created_at", { ascending: false });
    if (session.is_admin) {
      if (userId) query = query.eq("assignee_id", userId);
    } else {
      query = query.eq("assignee_id", session.id);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ tasks: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch tasks." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const body = await req.json();

    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

    const payload = {
      title,
      description: body?.description ? String(body.description) : null,
      assignee_id: session.is_admin ? body?.assignee_id || null : session.id,
      assignee_team: body?.assignee_team ? String(body.assignee_team) : null,
      priority: body?.priority ? String(body.priority) : "Medium",
      status: body?.status ? String(body.status) : "To Do",
      task_type: body?.task_type ? String(body.task_type) : "Generic Task",
      due_date: body?.due_date || null,
      channel_tags: Array.isArray(body?.channel_tags) ? body.channel_tags : [],
      campaign_context: body?.campaign_context ? String(body.campaign_context) : "",
    };

    const { data, error } = await supabase
      .from("tasks")
      .insert([payload])
      .select(
        "id,title,description,assignee_id,assignee_team,priority,status,task_type,due_date,channel_tags,campaign_context,created_at"
      )
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ task: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to create task." }, { status: 500 });
  }
}

