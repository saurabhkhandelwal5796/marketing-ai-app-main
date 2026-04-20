import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../lib/authSession";
import { getAuditSessionId } from "../../../lib/auditTracker";

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const campaignId = searchParams.get("campaignId");

    let query = supabase
      .from("tasks")
      .select(
        "id,title,description,assignee_id,assignee_team,priority,status,task_type,due_date,channel_tags,campaign_context,campaign_id,created_at"
      )
      .order("created_at", { ascending: false });
    if (session.is_admin) {
      if (userId) query = query.eq("assignee_id", userId);
    } else {
      query = query.eq("assignee_id", session.id);
    }
    if (campaignId) query = query.eq("campaign_id", campaignId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let milestoneQuery = supabase
      .from("milestone_tasks")
      .select("id,title,task_type,assignee_id,status,created_at,milestones!inner(title,campaign_id,end_date,description)")
      .order("created_at", { ascending: false });

    if (session.is_admin) {
      if (userId) milestoneQuery = milestoneQuery.eq("assignee_id", userId);
    } else {
      milestoneQuery = milestoneQuery.eq("assignee_id", session.id);
    }
    if (campaignId) milestoneQuery = milestoneQuery.eq("milestones.campaign_id", campaignId);

    const { data: milestoneRows, error: milestoneError } = await milestoneQuery;
    if (milestoneError) throw new Error(milestoneError.message);

    const normalizedMilestoneTasks = (milestoneRows || []).map((row) => {
      const m = row?.milestones || {};
      const status =
        row?.status === "Completed" ? "Done" : row?.status === "In Progress" ? "In Progress" : "To Do";
      return {
        id: `milestone:${row.id}`,
        title: row?.title || "",
        description: m?.description || null,
        assignee_id: row?.assignee_id || null,
        assignee_team: null,
        priority: "Medium",
        status,
        task_type: row?.task_type || "Generic Task",
        due_date: m?.end_date || null,
        milestone_name: m?.title || null,
        channel_tags: [],
        campaign_context: "Milestone task",
        campaign_id: m?.campaign_id || null,
        created_at: row?.created_at,
      };
    });

    return NextResponse.json({ tasks: [...(data || []), ...normalizedMilestoneTasks] });
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
    const campaign_id = body?.campaign_id || null;

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
      campaign_id,
    };

    let data;
    let error;
    {
      const res = await supabase
        .from("tasks")
        .insert([payload])
        .select(
          "id,title,description,assignee_id,assignee_team,priority,status,task_type,due_date,channel_tags,campaign_context,created_at"
        )
        .single();
      data = res.data;
      error = res.error;
    }
    if (error) throw new Error(error.message);

    // Track task creation in audit log
    try {
      const sessionId = getAuditSessionId();
      await supabase.from("audit_logs").insert({
        user_id: session.id,
        event_type: "action",
        page_name: "My Tasks",
        action_name: "Created Task",
        details: JSON.stringify({ taskId: data.id, title: data.title, campaign_id }),
        session_id: sessionId,
      });
    } catch (auditErr) {
      // eslint-disable-next-line no-console
      console.error("[audit] task creation log failed", auditErr);
    }

    return NextResponse.json({ task: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to create task." }, { status: 500 });
  }
}

