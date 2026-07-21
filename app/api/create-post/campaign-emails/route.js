import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get("campaignId");

    const supabase = getSupabaseServerClient();
    
    let query = supabase.from("campaign_emails").select("*").eq("user_id", session.id);
    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }
    
    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.warn("campaign_emails GET select warning:", error.message);
      return NextResponse.json({ emails: [] });
    }

    return NextResponse.json({ emails: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch campaign emails." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const body = await req.json();
    const { campaignId, emails } = body; // Array of { recipientEmail, recipientName, company, subject, body, sendStatus }

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: "No emails provided." }, { status: 400 });
    }

    const cid = campaignId || `CMP-${Date.now()}`;

    const recordsToInsert = emails.map(e => ({
      user_id: session.id,
      campaign_id: cid,
      recipient_email: e.recipientEmail || e.email || "",
      recipient_name: e.recipientName || e.name || "",
      company: e.company || "",
      subject: e.subject || "",
      body: e.body || "",
      send_status: e.sendStatus || e.status || "Pending", // 'Pending', 'Sent', 'Failed'
      updated_at: new Date().toISOString()
    }));

    try {
      const { data, error } = await supabase
        .from("campaign_emails")
        .insert(recordsToInsert)
        .select();

      if (error) {
        console.warn("campaign_emails insert warning:", error.message);
      }
    } catch (err) {
      console.warn("campaign_emails write exception:", err);
    }

    return NextResponse.json({ success: true, campaignId: cid, count: recordsToInsert.length });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to store campaign emails." }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const body = await req.json();
    const { campaignId, recipientEmail, sendStatus } = body;

    if (!campaignId || !recipientEmail || !sendStatus) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    try {
      const { data, error } = await supabase
        .from("campaign_emails")
        .update({ send_status: sendStatus, updated_at: new Date().toISOString() })
        .eq("user_id", session.id)
        .eq("campaign_id", campaignId)
        .eq("recipient_email", recipientEmail)
        .select();

      if (error) console.warn("campaign_emails status update warning:", error.message);
    } catch (err) {
      console.warn("campaign_emails status update exception:", err);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to update send status." }, { status: 500 });
  }
}
