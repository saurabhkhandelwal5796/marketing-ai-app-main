import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const provider = String(body.provider || "").toLowerCase();
    if (!provider) return NextResponse.json({ error: "Provider is required." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    
    // Delete connection row defensively
    try {
      await supabase
        .from("connected_accounts")
        .delete()
        .eq("user_id", session.id)
        .eq("provider", provider);

      if (provider === "gmail") {
        await supabase
          .from("google_integrations")
          .update({ is_active: false })
          .eq("user_id", session.id);
      }
    } catch (e) {
      console.error("Failed to delete from connected_accounts table:", e);
    }

    // Preserve legacy users table fields for linkedin
    if (provider === "linkedin") {
      await supabase
        .from("users")
        .update({
          linkedin_access_token: null,
          linkedin_token_expires_at: null,
          linkedin_member_urn: null,
        })
        .eq("id", session.id);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to disconnect account." }, { status: 500 });
  }
}
