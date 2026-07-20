import { NextResponse } from "next/server";
import { clearSessionCookie, getSessionFromCookies, setSessionCookie } from "../../../../lib/authSession";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("id,is_admin,status,company,name,email,role")
      .eq("id", session.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      await clearSessionCookie();
      return NextResponse.json({ user: null }, { status: 401 });
    }
    const status = String(data.status || "Active");
    if (status !== "Active") {
      await clearSessionCookie();
      return NextResponse.json({ error: "Account not active.", user: null }, { status: 403 });
    }

    // Refresh cookie with latest status/company/name in case admin updated it
    await setSessionCookie({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      is_admin: !!data.is_admin,
      company: data.company,
      status,
      admin_id: session.admin_id || null,
      admin_name: session.admin_name || null,
    });

    return NextResponse.json({
      user: {
        ...session,
        name: data.name,
        email: data.email,
        role: data.role,
        is_admin: !!data.is_admin,
        company: data.company,
        status,
      },
    });
  } catch {
    // If validation fails, keep existing behavior (don't break the app)
    return NextResponse.json({ user: session });
  }
}
