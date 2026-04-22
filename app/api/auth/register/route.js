import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { hashPassword } from "../../../../lib/passwords";

function initials(firstName, lastName) {
  const f = String(firstName || "").trim()[0] || "";
  const l = String(lastName || "").trim()[0] || "";
  return `${f}${l}`.toUpperCase() || "U";
}

export async function POST(req) {
  try {
    const body = await req.json();
    const firstName = String(body?.firstName || "").trim();
    const lastName = String(body?.lastName || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const company = String(body?.company || "").trim();
    const password = String(body?.password || "");
    const confirmPassword = String(body?.confirmPassword || "");

    if (!firstName || !lastName || !email || !company || !password || !confirmPassword) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: "Password and confirm password must match." }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const passwordHash = await hashPassword(password);
    const name = `${firstName} ${lastName}`.trim();
    const isAdmin = false;
    const role = "User";
    const status = "Pending";

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          first_name: firstName,
          last_name: lastName,
          company,
          name,
          email,
          password: passwordHash,
          role,
          is_admin: isAdmin,
          status,
          avatar: initials(firstName, lastName),
        },
      ])
      .select("id,name,email,role,is_admin,status")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Email already exists." }, { status: 409 });
      }
      if (String(error.message || "").includes("status")) {
        const fallback = await supabase
          .from("users")
          .insert([
            {
              first_name: firstName,
              last_name: lastName,
              company,
              name,
              email,
              password: passwordHash,
              role,
              is_admin: isAdmin,
              avatar: initials(firstName, lastName),
            },
          ])
          .select("id,name,email,role,is_admin,status")
          .single();
        if (fallback.error) throw new Error(fallback.error.message);
        return NextResponse.json({ user: { ...fallback.data, status }, requiresSignin: true });
      }
      throw new Error(error.message);
    }

    return NextResponse.json({ user: data, requiresSignin: true });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to create account." }, { status: 500 });
  }
}
