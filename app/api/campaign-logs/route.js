import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get("limit") || 200), 500);
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaign_logs")
      .select("id,campaign_id,campaign_name,channel,recipients,content,status,sent_at,opens,clicks")
      .order("sent_at", { ascending: false })
      .limit(limit);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ rows: data || [] });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to fetch campaign logs." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      campaign_id = null,
      campaign_name = "",
      channel = "",
      recipients = "",
      content = "",
      status = "sent",
      opens = 0,
      clicks = 0,
      sent_at = new Date().toISOString(),
    } = body || {};

    if (!campaign_name || !channel || !recipients || !content) {
      return NextResponse.json({ error: "Missing required fields for campaign log." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("campaign_logs")
      .insert([
        {
          campaign_id,
          campaign_name,
          channel,
          recipients,
          content,
          status,
          sent_at,
          opens,
          clicks,
        },
      ])
      .select("id, campaign_id, campaign_name, channel, status, sent_at, opens, clicks")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, log: data });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Failed to save campaign log." }, { status: 500 });
  }
}

