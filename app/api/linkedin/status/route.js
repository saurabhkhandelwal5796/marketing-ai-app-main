import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("linkedin_access_token,linkedin_member_urn,linkedin_token_expires_at")
      .eq("id", session.id)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const connected = !!(data?.linkedin_access_token && data?.linkedin_member_urn);
    const expiresAt = data?.linkedin_token_expires_at ? new Date(data.linkedin_token_expires_at).getTime() : 0;
    const expired = !!(expiresAt && Date.now() >= expiresAt);
    return NextResponse.json({ connected: connected && !expired, expired });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to load LinkedIn status." }, { status: 500 });
  }
}
