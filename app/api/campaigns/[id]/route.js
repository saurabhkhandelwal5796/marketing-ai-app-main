import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../lib/authSession";

const isMissingUpdatedByError = (message = "") =>
  /column .*updated_by.* does not exist/i.test(message) ||
  /Could not find the 'updated_by' column of 'campaigns' in the schema cache/i.test(message);

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
    const session = await getSessionFromCookies();
    const currentActor = session?.id || session?.name || session?.email || null;
    if (!currentActor) {
      return NextResponse.json({ error: "Unauthorized. Please log in again." }, { status: 401 });
    }
    const allowedKeys = new Set([
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
    let data = null;
    let error = null;
    ({ data, error } = await supabase
      .from("campaigns")
      .update({ ...updates, updated_by: currentActor })
      .eq("id", id)
      .select("*")
      .single());

    if (error && isMissingUpdatedByError(error.message || "")) {
      return NextResponse.json(
        {
          error:
            "Audit column updated_by is missing in campaigns table. Please add created_by/updated_by in Supabase, then retry.",
        },
        { status: 500 }
      );
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, campaign: data });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to update campaign." }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Campaign id is required." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("campaigns").delete().eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to delete campaign." }, { status: 500 });
  }
}
