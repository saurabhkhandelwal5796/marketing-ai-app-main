import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../lib/authSession";

function isCampaignOwnedBySession(campaign, session) {
  if (!campaign) return false;
  if (session?.is_admin) return true;
  return campaign?.created_by === session?.id || campaign?.updated_by === session?.id;
}

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const campaignId = String(searchParams.get("campaignId") || "").trim();
    if (!campaignId) return NextResponse.json({ points: [] });

    const supabase = getSupabaseServerClient();

    // Enforce ownership for non-admins
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id,created_by,updated_by")
      .eq("id", campaignId)
      .single();
    if (campaignError) throw new Error(campaignError.message);
    if (!isCampaignOwnedBySession(campaign, session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("campaign_selected_points")
      .select("id,campaign_id,point_id,content,created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);
    return NextResponse.json({ points: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch selected points." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const body = await req.json().catch(() => ({}));

    const campaign_id = String(body?.campaign_id || "").trim();
    const point_id = String(body?.point_id || "").trim();
    const content = body?.content ?? {};

    if (!campaign_id || !point_id) return NextResponse.json({ error: "campaign_id and point_id are required." }, { status: 400 });

    // Enforce ownership for non-admins
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id,created_by,updated_by")
      .eq("id", campaign_id)
      .single();
    if (campaignError) throw new Error(campaignError.message);
    if (!isCampaignOwnedBySession(campaign, session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { data, error } = await supabase
      .from("campaign_selected_points")
      .upsert(
        [
          {
            campaign_id,
            point_id,
            content,
          },
        ],
        { onConflict: "campaign_id,point_id" }
      )
      .select("id,campaign_id,point_id,content,created_at")
      .single();

    if (error) throw new Error(error.message);
    return NextResponse.json({ point: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to save selected point." }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const body = await req.json().catch(() => ({}));

    const campaign_id = String(body?.campaign_id || "").trim();
    const point_id = String(body?.point_id || "").trim();
    if (!campaign_id || !point_id) return NextResponse.json({ error: "campaign_id and point_id are required." }, { status: 400 });

    // Enforce ownership for non-admins
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id,created_by,updated_by")
      .eq("id", campaign_id)
      .single();
    if (campaignError) throw new Error(campaignError.message);
    if (!isCampaignOwnedBySession(campaign, session)) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const { error } = await supabase
      .from("campaign_selected_points")
      .delete()
      .eq("campaign_id", campaign_id)
      .eq("point_id", point_id);

    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to delete selected point." }, { status: 500 });
  }
}

