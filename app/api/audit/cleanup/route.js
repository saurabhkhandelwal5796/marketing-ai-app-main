import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies } from "../../../../lib/authSession";

export async function POST() {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!session.is_admin) return NextResponse.json({ error: "Admin only." }, { status: 403 });

    const supabase = getSupabaseServerClient();
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("audit_logs").delete().lt("created_at", cutoff);
    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, cutoff });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Cleanup failed." }, { status: 500 });
  }
}

