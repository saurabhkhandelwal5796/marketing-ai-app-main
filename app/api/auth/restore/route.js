import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies, setSessionCookie } from "../../../../lib/authSession";

export async function POST() {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!session.admin_id) return NextResponse.json({ error: "No admin session to restore." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,role,is_admin,status")
      .eq("id", session.admin_id)
      .eq("is_admin", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "Admin account not found." }, { status: 404 });

    await setSessionCookie({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      is_admin: !!data.is_admin,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to restore admin session." }, { status: 500 });
  }
}
