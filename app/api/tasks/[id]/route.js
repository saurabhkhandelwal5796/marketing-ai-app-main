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

function mapMilestoneStatusToTask(value) {
  if (value === "Completed") return "Done";
  if (value === "In Progress") return "In Progress";
  return "To Do";
}

function mapTaskStatusToMilestone(value) {
  if (value === "Done") return "Completed";
  if (value === "In Progress") return "In Progress";
  return "Not Started";
}

function parseMilestoneTaskId(id) {
  const raw = String(id || "");
  if (!raw.startsWith("milestone:")) return null;
  const milestoneTaskId = raw.slice("milestone:".length).trim();
  return milestoneTaskId || null;
}

export async function GET(_req, { params }) {
  try {
    const supabase = getSupabaseServerClient();
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Missing task id." }, { status: 400 });

    const milestoneTaskId = parseMilestoneTaskId(id);
    if (milestoneTaskId) {
      const { data, error } = await supabase
        .from("milestone_tasks")
        .select("id,title,task_type,assignee_id,status,created_at,milestones!inner(campaign_id,end_date,description)")
        .eq("id", milestoneTaskId)
        .single();
      if (error) throw new Error(error.message);
      return NextResponse.json({
        task: {
          id: `milestone:${data.id}`,
          title: data.title,
          description: data?.milestones?.description || null,
          assignee_id: data.assignee_id,
          assignee_team: null,
          priority: "Medium",
          status: mapMilestoneStatusToTask(data.status),
          task_type: data.task_type || "Generic Task",
          due_date: data?.milestones?.end_date || null,
          channel_tags: [],
          campaign_context: "Milestone task",
          campaign_id: data?.milestones?.campaign_id || null,
          created_at: data.created_at,
        },
      });
    }

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
    const milestoneTaskId = parseMilestoneTaskId(id);

    const body = await req.json();
    const patch = {};
    for (const [k, v] of Object.entries(body || {})) {
      if (!ALLOWED_FIELDS.has(k)) continue;
      patch[k] = v;
    }

    // if (milestoneTaskId) {
    //   const milestonePatch = {};
    //   if (Object.prototype.hasOwnProperty.call(body || {}, "status")) {
    //     milestonePatch.status = mapTaskStatusToMilestone(body.status);
    //   }
    //   if (Object.prototype.hasOwnProperty.call(body || {}, "assignee_id")) {
    //     milestonePatch.assignee_id = body?.assignee_id || null;
    //   }
    //   if (Object.keys(milestonePatch).length === 0) {
    //     return NextResponse.json({ error: "No supported fields for milestone task update." }, { status: 400 });
    //   }

    //   let updateQuery = supabase
    //     .from("milestone_tasks")
    //     .update(milestonePatch)
    //     .eq("id", milestoneTaskId)
    //     .select("id,title,task_type,assignee_id,status,created_at,milestones!inner(campaign_id,end_date,description)")
    //     .single();
    //   if (!session.is_admin) updateQuery = updateQuery.eq("assignee_id", session.id);
    //   const { data, error } = await updateQuery;
    //   if (error) throw new Error(error.message);

    //   return NextResponse.json({
    //     task: {
    //       id: `milestone:${data.id}`,
    //       title: data.title,
    //       description: data?.milestones?.description || null,
    //       assignee_id: data.assignee_id,
    //       assignee_team: null,
    //       priority: "Medium",
    //       status: mapMilestoneStatusToTask(data.status),
    //       task_type: data.task_type || "Generic Task",
    //       due_date: data?.milestones?.end_date || null,
    //       channel_tags: [],
    //       campaign_context: "Milestone task",
    //       campaign_id: data?.milestones?.campaign_id || null,
    //       created_at: data.created_at,
    //     },
    //   });
    // }

    if (milestoneTaskId) {
  const milestonePatch = {};
  if (Object.prototype.hasOwnProperty.call(body || {}, "status")) {
    milestonePatch.status = mapTaskStatusToMilestone(body.status);
  }
  if (Object.prototype.hasOwnProperty.call(body || {}, "assignee_id")) {
    milestonePatch.assignee_id = body?.assignee_id || null;
  }
  if (Object.keys(milestonePatch).length === 0) {
    return NextResponse.json({ error: "No supported fields for milestone task update." }, { status: 400 });
  }

  let updateQuery = supabase
    .from("milestone_tasks")
    .update(milestonePatch)
    .eq("id", milestoneTaskId)
    .select("id,title,task_type,assignee_id,status,created_at,milestone_id,milestones!inner(campaign_id,end_date,description)")
    .single();
  if (!session.is_admin) updateQuery = updateQuery.eq("assignee_id", session.id);
  const { data, error } = await updateQuery;
  if (error) throw new Error(error.message);

  // Recalculate milestone status when task status changes
  if (data.milestone_id) {
    const { data: allTasks } = await supabase
      .from("milestone_tasks")
      .select("id,status")
      .eq("milestone_id", data.milestone_id);
    
    if (allTasks && allTasks.length > 0) {
      const completed = allTasks.filter(t => t.status === "Completed").length;
      const progress = Math.round((completed / allTasks.length) * 100);
      
      let milestoneStatus = "Not Started";
      if (completed === allTasks.length) milestoneStatus = "Completed";
      else if (completed > 0) milestoneStatus = "In Progress";
      
      await supabase
        .from("milestones")
        .update({ progress, status: milestoneStatus })
        .eq("id", data.milestone_id);

      // Update campaign status if all milestones are completed
      const campaignId = data?.milestones?.campaign_id;
      if (campaignId) {
        const { data: allMilestones } = await supabase
          .from("milestones")
          .select("id,status")
          .eq("campaign_id", campaignId);
        
        if (allMilestones && allMilestones.length > 0) {
          const statuses = allMilestones.map(m => m.id === data.milestone_id ? milestoneStatus : m.status);
          let campaignStatus = "Open";
          if (statuses.every(s => s === "Completed")) campaignStatus = "Closed";
          else if (statuses.some(s => s === "In Progress" || s === "Completed")) campaignStatus = "In progress";
          
          await supabase
            .from("campaigns")
            .update({ status: campaignStatus })
            .eq("id", campaignId);
        }
      }
    }
  }

  return NextResponse.json({
    task: {
      id: `milestone:${data.id}`,
      title: data.title,
      description: data?.milestones?.description || null,
      assignee_id: data.assignee_id,
      assignee_team: null,
      priority: "Medium",
      status: mapMilestoneStatusToTask(data.status),
      task_type: data.task_type || "Generic Task",
      due_date: data?.milestones?.end_date || null,
      channel_tags: [],
      campaign_context: "Milestone task",
      campaign_id: data?.milestones?.campaign_id || null,
      created_at: data.created_at,
    },
  });
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
    const milestoneTaskId = parseMilestoneTaskId(id);

    if (milestoneTaskId) {
      let query = supabase.from("milestone_tasks").delete().eq("id", milestoneTaskId);
      if (!session.is_admin) query = query.eq("assignee_id", session.id);
      const { error } = await query;
      if (error) throw new Error(error.message);
      return NextResponse.json({ ok: true });
    }

    let query = supabase.from("tasks").delete().eq("id", id);
    if (!session.is_admin) query = query.eq("assignee_id", session.id);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete task." }, { status: 500 });
  }
}

