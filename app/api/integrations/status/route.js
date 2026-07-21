import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    
    // Fetch connected accounts defensively in case table is not yet created.
    let connectionsData = [];
    try {
      const { data, error } = await supabase
        .from("connected_accounts")
        .select("provider, connected, email_address, display_name")
        .eq("user_id", session.id);
      
      if (!error && data) {
        connectionsData = data;
      }
    } catch (e) {
      console.warn("connected_accounts table read failed or not created yet:", e);
    }

    const providers = ["linkedin", "instagram", "facebook", "outlook", "gmail"];
    const connections = {};
    providers.forEach(p => {
      const conn = connectionsData.find(c => c.provider === p && c.connected);
      connections[p] = {
        connected: !!conn,
        displayName: conn?.display_name || "",
        emailAddress: conn?.email_address || "",
      };
    });

    const configured = {
      linkedin: !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET),
      instagram: !!(process.env.INSTAGRAM_CLIENT_ID && process.env.INSTAGRAM_CLIENT_SECRET),
      facebook: !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET),
      outlook: !!(
        (process.env.OUTLOOK_CLIENT_ID && process.env.OUTLOOK_CLIENT_SECRET) ||
        (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET)
      ),
      gmail: !!(
        (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET) ||
        (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
      ),
    };

    return NextResponse.json({ connections, configured });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to load integrations status." }, { status: 500 });
  }
}
