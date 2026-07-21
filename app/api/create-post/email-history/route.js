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
    const { recipient, subject, status, sent_via } = body;

    if (!recipient) {
      return NextResponse.json({ error: "Recipient is required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("create_post_email_history")
      .insert({
        user_id: session.id,
        recipient,
        subject: subject || "",
        status: status || "Sent",
        sent_via: sent_via || "Automated Gmail",
        sent_timestamp: new Date().toISOString()
      })
      .select()
      .maybeSingle();

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, record: data });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to save email history." }, { status: 500 });
  }
}
