import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../../../lib/authSession";

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
    const { id: milestoneId, taskId } = await params;
    
    if (!milestoneId || !taskId) {
      return NextResponse.json({ error: "Missing milestone or task ID." }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const patch = {};
    if (Object.prototype.hasOwnProperty.call(body, "status")) {
      patch.status = normalizeTaskStatus(body?.status);
    }
    if (Object.prototype.hasOwnProperty.call(body, "assignee_id")) {
      patch.assignee_id = body?.assignee_id || null;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
    }

    // Update the milestone task in-place (no new task creation).
    const { data: updatedTask, error: updateTaskError } = await supabase
      .from("milestone_tasks")
      .update(patch)
      .eq("id", taskId)
      .eq("milestone_id", milestoneId)
      .select("id,milestone_id,title,task_type,assignee_id,status,created_at")
      .single();

    if (updateTaskError) throw new Error(updateTaskError.message);

    // Recompute milestone progress/status based on tasks
    // const { data: milestoneRow, error: milestoneFetchError } = await supabase
    //   .from("milestones")
    //   .select("id,end_date")
    //   .eq("id", milestoneId)
    //   .single();
    // if (milestoneFetchError) throw new Error(milestoneFetchError.message);
           const { data: milestoneRow, error: milestoneFetchError } = await supabase
      .from("milestones")
      .select("id,end_date,campaign_id")
      .eq("id", milestoneId)
      .single();
    if (milestoneFetchError) throw new Error(milestoneFetchError.message);



    const { data: allTasks, error: tasksFetchError } = await supabase
      .from("milestone_tasks")
      .select("id,status")
      .eq("milestone_id", milestoneId);
    if (tasksFetchError) throw new Error(tasksFetchError.message);

    const progress = computeProgress(allTasks || []);
    const milestoneStatus = computeMilestoneStatus(allTasks || [], milestoneRow?.end_date || null);

    // const { error: updateMilestoneError } = await supabase
    //   .from("milestones")
    //   .update({ progress, status: milestoneStatus })
    //   .eq("id", milestoneId);
    // if (updateMilestoneError) throw new Error(updateMilestoneError.message);
        const { error: updateMilestoneError } = await supabase
      .from("milestones")
      .update({ progress, status: milestoneStatus })
      .eq("id", milestoneId);
    if (updateMilestoneError) throw new Error(updateMilestoneError.message);

    // Auto-update campaign status based on all its milestones
    const campaignId = milestoneRow?.campaign_id || body?.campaign_id || null;
    if (campaignId) {
      const { data: allMilestones } = await supabase
        .from("milestones")
        .select("id,status")
        .eq("campaign_id", campaignId);
      if (Array.isArray(allMilestones) && allMilestones.length > 0) {
        const statuses = allMilestones.map((m) => (m.id === milestoneId ? milestoneStatus : m.status));
        let campaignStatus = "Open";
        if (statuses.every((s) => s === "Completed")) campaignStatus = "Closed";
        else if (statuses.some((s) => s === "In Progress" || s === "Completed")) campaignStatus = "In progress";
        await supabase.from("campaigns").update({ status: campaignStatus }).eq("id", campaignId);
      }
    }


    let assigneeName = "-";
    let assigneeAvatar = "";
    if (updatedTask?.assignee_id) {
      const { data: assigneeRow } = await supabase
        .from("users")
        .select("id,name,avatar")
        .eq("id", updatedTask.assignee_id)
        .single();
      assigneeName = assigneeRow?.name || "-";
      assigneeAvatar = assigneeRow?.avatar || "";
    }

    return NextResponse.json({
      task: {
        ...updatedTask,
        assignee_name: assigneeName,
        assignee_avatar: assigneeAvatar,
        campaign_id: body?.campaign_id || null,
      },
      progress,
      status: milestoneStatus,
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to update milestone task." }, { status: 500 });
  }
}
