import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export async function GET(req) {
  try {
    const supabase = getSupabaseServerClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const campaignId = searchParams.get("campaignId");

    if (id) {
      const { data, error } = await supabase.from("campaign_history").select("*").eq("id", id).single();
      if (error) throw new Error(error.message);
      return NextResponse.json({ record: data });
    }

    let query = supabase.from("campaign_history").select("*").order("created_at", { ascending: false }).limit(200);
    if (campaignId) query = query.eq("campaign_id", campaignId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ records: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch campaign history." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const supabase = getSupabaseServerClient();
    const body = await req.json().catch(() => ({}));

    const campaign_id = typeof body?.campaign_id === "string" ? body.campaign_id : "";
    if (!campaign_id) return NextResponse.json({ error: "campaign_id is required." }, { status: 400 });

    const payload = {
      campaign_id,
      company: typeof body?.company === "string" ? body.company : "",
      goal: typeof body?.goal === "string" ? body.goal : "",
      website: typeof body?.website === "string" ? body.website : "",
      description: typeof body?.description === "string" ? body.description : "",
      marketing_details: Array.isArray(body?.marketing_details) ? body.marketing_details : [],
      target_audience: Array.isArray(body?.target_audience) ? body.target_audience : [],
      marketing_plan: Array.isArray(body?.marketing_plan) ? body.marketing_plan : [],
    };

    const { data, error } = await supabase.from("campaign_history").insert([payload]).select("id").single();
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, id: data?.id || null });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to save campaign history." }, { status: 500 });
  }
}

