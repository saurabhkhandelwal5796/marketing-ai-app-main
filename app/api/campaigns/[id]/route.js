import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET(_req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Campaign id is required." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ campaign: data });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to fetch campaign." }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Campaign id is required." }, { status: 400 });

    const body = await req.json();
    const allowedKeys = new Set([
      "name",
      "company",
      "goal",
      "website",
      "attachment_name",
      "description",
      "chat_messages",
      "marketing_plan",
      "selected_step_ids",
      "recommended_actions",
      "selected_actions",
      "outputs",
    ]);
    const updates = Object.fromEntries(
      Object.entries(body || {}).filter(([key]) => allowedKeys.has(key))
    );
    updates.last_activity_at = new Date().toISOString();

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaigns")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, campaign: data });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to update campaign." }, { status: 500 });
  }
}
