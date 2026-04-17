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
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!Array.isArray(tasks) || tasks.length === 0) {
    if (fallbackEndDate) {
      const due = new Date(`${fallbackEndDate}T00:00:00`);
      if (!Number.isNaN(due.getTime()) && due < today) return "Overdue";
    }
    return "Not Started";
  }

  const completed = tasks.filter((task) => normalizeTaskStatus(task?.status) === "Completed").length;
  if (completed === tasks.length) return "Completed";
  if (completed > 0) return "In Progress";

  if (fallbackEndDate) {
    const due = new Date(`${fallbackEndDate}T00:00:00`);
    if (!Number.isNaN(due.getTime()) && due < today) return "Overdue";
  }
  return "Not Started";
}

export async function DELETE(_req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing task id." }, { status: 400 });

    // Ensure the caller can delete this task.
    const { data: taskRow, error: taskFetchError } = await supabase
      .from("milestone_tasks")
      .select("id,milestone_id,assignee_id")
      .eq("id", id)
      .single();

    if (taskFetchError) throw new Error(taskFetchError.message);
    if (!taskRow) return NextResponse.json({ error: "Milestone task not found." }, { status: 404 });

    if (!session.is_admin && taskRow.assignee_id !== session.id) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    // Delete task first.
    const { error: deleteError } = await supabase.from("milestone_tasks").delete().eq("id", id);
    if (deleteError) throw new Error(deleteError.message);

    // Recompute milestone progress/status based on remaining tasks.
    const { data: milestoneRow, error: milestoneFetchError } = await supabase
      .from("milestones")
      .select("id,end_date")
      .eq("id", taskRow.milestone_id)
      .single();
    if (milestoneFetchError) throw new Error(milestoneFetchError.message);

    const { data: remainingTasks, error: tasksFetchError } = await supabase
      .from("milestone_tasks")
      .select("id,status")
      .eq("milestone_id", taskRow.milestone_id);
    if (tasksFetchError) throw new Error(tasksFetchError.message);

    const progress = computeProgress(remainingTasks || []);
    const status = computeMilestoneStatus(remainingTasks || [], milestoneRow?.end_date || null);

    const { error: updateError } = await supabase
      .from("milestones")
      .update({ progress, status })
      .eq("id", taskRow.milestone_id);
    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete milestone task." }, { status: 500 });
  }
}

