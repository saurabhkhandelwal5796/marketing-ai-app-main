import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../../lib/supabaseServer";

export async function GET(_req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Campaign id is required." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaign_ai_turns")
      .select("*")
      .eq("campaign_id", id)
      .order("created_at", { ascending: true })
      .limit(400);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ turns: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to fetch conversation history." },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Campaign id is required." }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const role = body?.role === "assistant" ? "assistant" : "user";
    const content = typeof body?.content === "string" ? body.content : "";
    const interaction = body?.interaction && typeof body.interaction === "object" ? body.interaction : {};
    const metadata = body?.metadata && typeof body.metadata === "object" ? body.metadata : {};
    const selectedOption = typeof body?.selected_option === "string" ? body.selected_option : "";

    if (!content.trim()) {
      return NextResponse.json({ error: "Message content is required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaign_ai_turns")
      .insert([
        {
          campaign_id: id,
          role,
          content,
          interaction,
          selected_option: selectedOption,
          metadata,
        },
      ])
      .select("*")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, turn: data });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to save conversation turn." },
      { status: 500 }
    );
  }
}
