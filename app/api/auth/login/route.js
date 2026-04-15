import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { setSessionCookie } from "../../../../lib/authSession";
import { verifyPassword } from "../../../../lib/passwords";

export async function POST(req) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,role,is_admin,password,status")
      .eq("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    if (data.status === "Inactive") {
      return NextResponse.json({ error: "User is inactive." }, { status: 403 });
    }

    const ok = await verifyPassword(password, data.password);
    if (!ok) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

    await setSessionCookie({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      is_admin: !!data.is_admin,
    });
    return NextResponse.json({
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        is_admin: !!data.is_admin,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to login." }, { status: 500 });
  }
}
