import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../lib/authSession";
import { getAuditSessionId } from "../../../lib/auditTracker";

function normalizeMilestoneStatus(value) {
  const status = String(value || "").trim();
  if (["Not Started", "In Progress", "Completed", "Overdue"].includes(status)) return status;
  return "Not Started";
}

function normalizeTaskStatus(value) {
  const status = String(value || "").trim();
  if (["Not Started", "In Progress", "Completed"].includes(status)) return status;
  return "Not Started";
}

function computeProgress(tasks = [], fallbackProgress = 0) {
  if (!Array.isArray(tasks) || tasks.length === 0) return Number(fallbackProgress) || 0;
  const completed = tasks.filter((task) => normalizeTaskStatus(task?.status) === "Completed").length;
  return Math.round((completed / tasks.length) * 100);
}

function computeMilestoneStatus(tasks = [], fallbackStatus = "Not Started", endDate = null) {
  if (Array.isArray(tasks) && tasks.length > 0) {
    const completed = tasks.filter((task) => normalizeTaskStatus(task?.status) === "Completed").length;
    if (completed === tasks.length) return "Completed";
    if (completed > 0) return "In Progress";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (endDate) {
      const due = new Date(`${endDate}T00:00:00`);
      if (!Number.isNaN(due.getTime()) && due < today) return "Overdue";
    }
    return "Not Started";
  }
  return normalizeMilestoneStatus(fallbackStatus);
}
  

async function enrichMilestones(supabase, milestones) {
  const items = Array.isArray(milestones) ? milestones : [];
  if (!items.length) return [];

  const campaignIds = Array.from(new Set(items.map((item) => item?.campaign_id).filter(Boolean)));
  const assigneeIds = Array.from(new Set(items.map((item) => item?.assignee_id).filter(Boolean)));
  const milestoneIds = items.map((item) => item.id).filter(Boolean);

  const [{ data: campaigns = [] }, { data: users = [] }, { data: taskRows = [] }] = await Promise.all([
    campaignIds.length
      ? supabase.from("campaigns").select("id,name,company,goal").in("id", campaignIds)
      : Promise.resolve({ data: [] }),
    assigneeIds.length
      ? supabase.from("users").select("id,name,email,avatar").in("id", assigneeIds)
      : Promise.resolve({ data: [] }),
    milestoneIds.length
      ? supabase
          .from("milestone_tasks")
          .select("id,milestone_id,title,task_type,assignee_id,status,created_at")
          .in("milestone_id", milestoneIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const campaignById = Object.fromEntries((campaigns || []).map((campaign) => [campaign.id, campaign]));
  const userById = Object.fromEntries((users || []).map((user) => [user.id, user]));

  const tasksByMilestoneId = {};
  for (const task of taskRows || []) {
    const taskAssignee = userById[task.assignee_id] || null;
    const enrichedTask = {
      ...task,
      task_type: task.task_type || "Generic Task",
      status: normalizeTaskStatus(task.status),
      assignee_name: taskAssignee?.name || "-",
      assignee_avatar: taskAssignee?.avatar || "",
    };
    if (!tasksByMilestoneId[task.milestone_id]) tasksByMilestoneId[task.milestone_id] = [];
    tasksByMilestoneId[task.milestone_id].push(enrichedTask);
  }

  return items.map((milestone) => {
    const campaign = campaignById[milestone.campaign_id] || null;
    const assignee = userById[milestone.assignee_id] || null;
    const tasks = tasksByMilestoneId[milestone.id] || [];
    const progress = computeProgress(tasks, milestone.progress);
    // const status = computeMilestoneStatus(tasks, milestone.status, milestone.end_date);
    const status = normalizeMilestoneStatus(milestone.status);

    return {
      ...milestone,
      status,
      progress,
      campaign_name: campaign?.name || "-",
      campaign_company: campaign?.company || "",
      assignee_name: assignee?.name || "-",
      assignee_avatar: assignee?.avatar || "",
      task_count: tasks.length,
      tasks_done: tasks.filter((task) => task.status === "Completed").length,
      tasks,
    };
  });
}

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const campaignId = String(searchParams.get("campaignId") || "").trim();
    const assigneeId = String(searchParams.get("assigneeId") || "").trim();
    const status = String(searchParams.get("status") || "").trim();

    let query = supabase
      .from("milestones")
      .select("id,title,description,campaign_id,assignee_id,status,start_date,end_date,progress,created_at,updated_at")
      .order("created_at", { ascending: false });

    if (campaignId) query = query.eq("campaign_id", campaignId);
    if (assigneeId) query = query.eq("assignee_id", assigneeId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const milestones = await enrichMilestones(supabase, data || []);
    return NextResponse.json({ milestones });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch milestones." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const body = await req.json().catch(() => ({}));

    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

    const payload = {
      title,
      description: String(body?.description || "").trim(),
      campaign_id: body?.campaign_id || null,
      assignee_id: body?.assignee_id || null,
      status: normalizeMilestoneStatus(body?.status),
      start_date: body?.start_date || null,
      end_date: body?.end_date || null,
      progress: Math.max(0, Math.min(100, Number(body?.progress) || 0)),
    };

    const { data, error } = await supabase
      .from("milestones")
      .insert([payload])
      .select("id,title,description,campaign_id,assignee_id,status,start_date,end_date,progress,created_at,updated_at")
      .single();

    if (error) throw new Error(error.message);

    // Track milestone creation in audit log
    try {
      const sessionId = getAuditSessionId();
      await supabase.from("audit_logs").insert({
        user_id: session.id,
        event_type: "action",
        page_name: "Milestones",
        action_name: "Created Milestone",
        details: JSON.stringify({ milestoneId: data.id, title: data.title, campaign_id: data.campaign_id }),
        session_id: sessionId,
      });
    } catch (auditErr) {
      console.error("[audit] milestone creation log failed", auditErr);
    }

    const [milestone] = await enrichMilestones(supabase, [data]);
    return NextResponse.json({ milestone });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to create milestone." }, { status: 500 });
  }
}
