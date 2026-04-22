import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies, setSessionCookie } from "../../../../lib/authSession";

export async function POST(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    if (!session.is_admin) return NextResponse.json({ error: "Admin only action." }, { status: 403 });

    const body = await req.json();
    const userId = String(body?.userId || "").trim();
    if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,role,is_admin,status,company")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (data.is_admin) return NextResponse.json({ error: "Cannot impersonate another admin." }, { status: 400 });

    await setSessionCookie({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      is_admin: !!data.is_admin,
      status: data.status || "Active",
      company: data.company,
      admin_id: session.id,
      admin_name: session.name,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to switch user." }, { status: 500 });
  }
}
