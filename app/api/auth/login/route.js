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
      .select("id,name,email,role,is_admin,password,status,company")
      .eq("email", email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    const status = String(data.status || "Active");
    if (status === "Pending") {
      return NextResponse.json(
        { error: "Your account is not approved yet. Please wait for admin approval." },
        { status: 403 }
      );
    }
    if (status !== "Active") {
      return NextResponse.json({ error: "Your account is not active. Please contact an administrator." }, { status: 403 });
    }

    const ok = await verifyPassword(password, data.password);
    if (!ok) return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });

    await setSessionCookie({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      is_admin: !!data.is_admin,
      company: data.company,
      status,
    });
    return NextResponse.json({
      user: {
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
        is_admin: !!data.is_admin,
        company: data.company,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to login." }, { status: 500 });
  }
}
