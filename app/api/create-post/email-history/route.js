import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("create_post_email_history")
      .select("*")
      .eq("user_id", session.id)
      .order("sent_timestamp", { ascending: false });

    if (error) {
      console.warn("create_post_email_history select failed, table might not exist yet:", error.message);
      return NextResponse.json({ history: [] });
    }

    return NextResponse.json({ history: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch email history." }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { recipient, recipient_name, company, subject, email_body, status, sent_via } = body;

    if (!recipient) {
      return NextResponse.json({ error: "Recipient is required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    
    // Primary insert payload with full details
    const insertPayload = {
      user_id: session.id,
      recipient,
      recipient_name: recipient_name || "",
      company: company || "",
      subject: subject || "",
      email_body: email_body || body.body || "",
      status: status || "Sent",
      sent_via: sent_via || "Automated Gmail",
      sent_timestamp: new Date().toISOString()
    };

    let data = null;
    let { data: insData, error } = await supabase
      .from("create_post_email_history")
      .insert(insertPayload)
      .select()
      .maybeSingle();

    if (error) {
      // Fallback to basic columns if schema doesn't have extended columns yet
      const fallbackPayload = {
        user_id: session.id,
        recipient,
        subject: subject || "",
        status: status || "Sent",
        sent_via: sent_via || "Automated Gmail",
        sent_timestamp: new Date().toISOString()
      };
      const fallbackRes = await supabase
        .from("create_post_email_history")
        .insert(fallbackPayload)
        .select()
        .maybeSingle();
      
      if (fallbackRes.error) {
        console.warn("create_post_email_history insert warning:", fallbackRes.error.message);
      } else {
        data = fallbackRes.data;
      }
    } else {
      data = insData;
    }

    return NextResponse.json({ success: true, record: data || insertPayload });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to save email history." }, { status: 500 });
  }
}
