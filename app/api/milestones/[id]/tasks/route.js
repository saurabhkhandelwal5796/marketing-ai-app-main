import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../../lib/authSession";

function normalizeTaskStatus(value) {
  const status = String(value || "").trim();
  if (["Not Started", "In Progress", "Completed"].includes(status)) return status;
  return "Not Started";
}

function computeProgress(tasks = []) {
  if (!Array.isArray(tasks) || tasks.length === 0) return 0;
  const completed = tasks.filter((task) => normalizeTaskStatus(task?.status) === "Completed").length;
  return Math.round((completed / tasks.length) * 100);
}

function computeMilestoneStatus(tasks = [], fallbackEndDate = null) {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (fallbackEndDate) {
      const due = new Date(`${fallbackEndDate}T00:00:00`);
      if (!Number.isNaN(due.getTime()) && due < today) return "Overdue";
    }
    return "Not Started";
  }
  const completed = tasks.filter((task) => normalizeTaskStatus(task?.status) === "Completed").length;
  if (completed === tasks.length) return "Completed";
  if (completed > 0) return "In Progress";

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (fallbackEndDate) {
    const due = new Date(`${fallbackEndDate}T00:00:00`);
    if (!Number.isNaN(due.getTime()) && due < today) return "Overdue";
  }
  return "Not Started";
}

export async function POST(req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing milestone id." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const title = String(body?.title || "").trim();
    if (!title) return NextResponse.json({ error: "Task title is required." }, { status: 400 });

    const { data: milestone, error: milestoneError } = await supabase
      .from("milestones")
      .select("id,end_date")
      .eq("id", id)
      .single();
    if (milestoneError) throw new Error(milestoneError.message);

    const payload = {
      milestone_id: id,
      title,
      task_type: String(body?.task_type || "Generic Task").trim() || "Generic Task",
      assignee_id: body?.assignee_id || null,
      status: normalizeTaskStatus(body?.status),
    };

    const { data, error } = await supabase
      .from("milestone_tasks")
      .insert([payload])
      .select("id,milestone_id,title,task_type,assignee_id,status,created_at")
      .single();
    if (error) throw new Error(error.message);

    const { data: allTasks, error: tasksError } = await supabase
      .from("milestone_tasks")
      .select("id,status")
      .eq("milestone_id", id);
    if (tasksError) throw new Error(tasksError.message);

    const progress = computeProgress(allTasks || []);
    const status = computeMilestoneStatus(allTasks || [], milestone?.end_date || null);

    const { error: updateError } = await supabase.from("milestones").update({ progress, status }).eq("id", id);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ task: data, progress, status });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to add milestone task." }, { status: 500 });
  }
}
