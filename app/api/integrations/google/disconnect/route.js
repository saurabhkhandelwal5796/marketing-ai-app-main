import { NextResponse } from "next/server";
import { getSessionFromCookies } from "../../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../../lib/supabaseServer";

export async function POST() {
  try {
    const session = await getSessionFromCookies();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const supabase = getSupabaseServerClient();

    // Set is_active = false on google_integrations
    const { error: gError } = await supabase
      .from("google_integrations")
      .update({ is_active: false })
      .eq("user_id", session.id);

    if (gError) {
      throw new Error(`Failed to set inactive on google_integrations: ${gError.message}`);
    }

    // Delete provider: "gmail" from connected_accounts for backward compatibility
    try {
      await supabase
        .from("connected_accounts")
        .delete()
        .eq("user_id", session.id)
        .eq("provider", "gmail");
    } catch (e) {
      console.warn("Backward compatibility disconnect failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to disconnect Google account." },
      { status: 500 }
    );
  }
}
