import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../lib/authSession";

const ALLOWED_FIELDS = new Set(["title", "description", "campaign_id", "assignee_id", "start_date", "end_date", "status"]);

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

export async function PATCH(req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing milestone id." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const patch = {};
    for (const [key, value] of Object.entries(body || {})) {
      if (!ALLOWED_FIELDS.has(key)) continue;
      patch[key] = value;
    }

    const { data: updatedMilestone, error: updateError } = await supabase
      .from("milestones")
      .update(patch)
      .eq("id", id)
      .select("id,title,description,campaign_id,assignee_id,status,start_date,end_date,progress,created_at,updated_at")
      .single();

    if (updateError) throw new Error(updateError.message);

    if (Object.prototype.hasOwnProperty.call(patch, "assignee_id")) {
      const newAssignee = patch.assignee_id || null;
      const { error: tasksAssigneeError } = await supabase
        .from("milestone_tasks")
        .update({ assignee_id: newAssignee })
        .eq("milestone_id", id);
      if (tasksAssigneeError) throw new Error(tasksAssigneeError.message);
    }

    const { data: tasks, error: tasksError } = await supabase
      .from("milestone_tasks")
      .select("id,status")
      .eq("milestone_id", id);
    if (tasksError) throw new Error(tasksError.message);

    const isManualStatus = Object.prototype.hasOwnProperty.call(patch, "status");
    const progress = computeProgress(tasks || []);
    const status = isManualStatus
      ? normalizeMilestoneStatus(patch.status)
      : computeMilestoneStatus(tasks || [], updatedMilestone?.end_date || null);

    const { error: recomputeError } = await supabase
      .from("milestones")
      .update(isManualStatus ? { progress } : { progress, status })
      .eq("id", id);
    if (recomputeError) throw new Error(recomputeError.message);

    // Auto-update campaign status based on all its milestones
    // // Auto-update campaign status based on all its milestones
    // const campaignId = updatedMilestone?.campaign_id;
    // if (campaignId) {
    //   const { data: allMilestones } = await supabase
    //     .from("milestones")
    //     .select("id,status")
    //     .eq("campaign_id", campaignId);
    //   if (Array.isArray(allMilestones) && allMilestones.length > 0) {
    //     const effectiveStatus = normalizeMilestoneStatus(patch.status ?? updatedMilestone.status);
    //     const statuses = allMilestones.map((m) => (m.id === id ? effectiveStatus : m.status));
    //     let campaignStatus = "Open";
    //     if (statuses.every((s) => s === "Completed")) campaignStatus = "Closed";
    //     else if (statuses.some((s) => s === "In Progress" || s === "Completed")) campaignStatus = "In progress";
    //     await supabase.from("campaigns").update({ status: campaignStatus }).eq("id", campaignId);
    //   }
    // }


    const { data: finalMilestone, error: finalError } = await supabase
      .from("milestones")
      .select("id,title,description,campaign_id,assignee_id,status,start_date,end_date,progress,created_at,updated_at")
      .eq("id", id)
      .single();
    if (finalError) throw new Error(finalError.message);

    return NextResponse.json({ milestone: finalMilestone });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to update milestone." }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing milestone id." }, { status: 400 });

    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete milestone." }, { status: 500 });
  }
}
