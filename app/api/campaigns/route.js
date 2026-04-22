import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../lib/authSession";
import { getAuditSessionId } from "../../../lib/auditTracker";

const getDefaultChatMessage = () => [
  {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role: "assistant",
    content:
      "Share your campaign brief here. I will build a detailed marketing plan, suggest channels, and generate content.",
  },
];

const isMissingColumnError = (message = "") =>
  /column .*created_by.* does not exist/i.test(message) ||
  /column .*updated_by.* does not exist/i.test(message) ||
  /Could not find the 'created_by' column of 'campaigns' in the schema cache/i.test(message) ||
  /Could not find the 'updated_by' column of 'campaigns' in the schema cache/i.test(message);

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 20, 1), 50);
    const offset = Math.max(Number(searchParams.get("offset")) || 0, 0);
    const supabase = getSupabaseServerClient();
    let campaigns = null;
    let error = null;
    let query = supabase
      .from("campaigns")
      .select("id,name,company,goal,created_at,updated_at,last_activity_at,created_by,updated_by")
      .order("last_activity_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (!session.is_admin) {
      const allowedActors = [session.id, session.email, session.name].filter(Boolean);
      if (allowedActors.length) query = query.in("created_by", allowedActors);
      else query = query.eq("id", "__none__");
    }

    ({ data: campaigns, error } = await query);
    if (error && isMissingColumnError(error.message || "")) {
      let fallback = supabase
        .from("campaigns")
        .select("id,name,company,goal,created_at,updated_at,last_activity_at")
        .order("last_activity_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (!session.is_admin) {
        // Without audit columns, we cannot securely filter — fail closed.
        return NextResponse.json(
          { campaigns: [], hasMore: false },
          { status: 200 }
        );
      }

      ({ data: campaigns, error } = await fallback);
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const ids = Array.from(
      new Set(
        (campaigns || [])
          .flatMap((item) => [item?.created_by, item?.updated_by])
          .filter((value) => typeof value === "string" && value.trim())
      )
    );
    const uuidIds = ids.filter((value) => UUID_RE.test(value));
    let userNameById = {};
    if (uuidIds.length) {
      const { data: users } = await supabase.from("users").select("id,name").in("id", uuidIds);
      userNameById = Object.fromEntries((users || []).map((user) => [user.id, user.name]));
    }
    const enrichedCampaigns = (campaigns || []).map((item) => ({
      ...item,
      created_by_name: userNameById[item.created_by] || (item.created_by && !UUID_RE.test(item.created_by) ? item.created_by : "-"),
      last_modified_by_name:
        userNameById[item.updated_by] || (item.updated_by && !UUID_RE.test(item.updated_by) ? item.updated_by : "-"),
    }));
    return NextResponse.json({ campaigns: enrichedCampaigns, hasMore: (campaigns || []).length === limit });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to fetch campaigns." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const session = await getSessionFromCookies();
    const currentActor = session?.id || session?.name || session?.email || "";
    if (!currentActor) {
      return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
    }
    const supabase = getSupabaseServerClient();
    const baseInsert = {
      name: body?.name || "Generating title...",
      company: body?.company || "",
      goal: body?.goal || "",
      website: body?.website || "",
      attachment_name: body?.attachment_name || "",
      description: body?.description || "",
      chat_messages: getDefaultChatMessage(),
      marketing_plan: [],
      selected_step_ids: [],
      recommended_actions: [],
      selected_actions: [],
      outputs: {},
    };
    let data = null;
    let error = null;
    ({ data, error } = await supabase
      .from("campaigns")
      .insert([
        {
          ...baseInsert,
          created_by: currentActor || null,
          updated_by: currentActor || null,
        },
      ])
      .select("id,name,company,goal,updated_at,last_activity_at,created_by,updated_by")
      .single());
    if (error && isMissingColumnError(error.message || "")) {
      return NextResponse.json(
        {
          error:
            "Audit columns missing in campaigns table. Please add created_by and updated_by in Supabase, then retry.",
        },
        { status: 500 }
      );
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, campaign: data });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to create campaign." }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids.filter((id) => typeof id === "string" && id.trim()) : [];
    if (!ids.length) {
      return NextResponse.json({ error: "No campaign IDs provided." }, { status: 400 });
    }
    const session = await getSessionFromCookies();
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("campaigns").delete().in("id", ids);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Track campaign deletion in audit log
    try {
      const sessionId = getAuditSessionId();
      await supabase.from("audit_logs").insert({
        user_id: session.id,
        event_type: "action",
        page_name: "Campaigns",
        action_name: "Deleted Campaign",
        details: JSON.stringify({ campaignIds: ids, count: ids.length }),
        session_id: sessionId,
      });
    } catch (auditErr) {
      console.error("[audit] campaign deletion log failed", auditErr);
    }

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to delete campaigns." }, { status: 500 });
  }
}
