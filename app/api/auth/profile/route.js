import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../../lib/supabaseServer";
import { getSessionFromCookies, setSessionCookie } from "../../../../lib/authSession";
import { hashPassword } from "../../../../lib/passwords";

function safeString(value) {
  return String(value || "").trim();
}

function splitName(fullName) {
  const parts = safeString(fullName).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

export async function GET() {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .select("id,name,email,first_name,last_name,company,avatar")
      .eq("id", session.id)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return NextResponse.json({ error: "User not found." }, { status: 404 });

    const fallbackName = splitName(data.name);

    return NextResponse.json({
      user: {
        id: data.id,
        firstName: safeString(data.first_name) || fallbackName.firstName,
        lastName: safeString(data.last_name) || fallbackName.lastName,
        email: safeString(data.email),
        company: safeString(data.company),
        name: safeString(data.name),
        avatar: safeString(data.avatar),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to fetch profile." }, { status: 500 });
  }
}

export async function PATCH(req) {
  try {
    const session = await getSessionFromCookies();
    if (!session) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

    const body = await req.json();
    const firstName = safeString(body?.firstName);
    const lastName = safeString(body?.lastName);
    const email = safeString(body?.email).toLowerCase();
    const company = safeString(body?.company);
    const newPassword = String(body?.newPassword || "");
    const confirmPassword = String(body?.confirmPassword || "");
    const avatarDataUrl = String(body?.avatar || "").trim();

    if (!firstName || !lastName || !email || !company) {
      return NextResponse.json({ error: "First name, last name, email, and company are required." }, { status: 400 });
    }

    if (newPassword || confirmPassword) {
      if (newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
      }
      if (newPassword !== confirmPassword) {
        return NextResponse.json({ error: "New password and confirm password must match." }, { status: 400 });
      }
    }

    const name = `${firstName} ${lastName}`.trim();
    const patch = {
      first_name: firstName,
      last_name: lastName,
      company,
      name,
      email,
    };

    if (avatarDataUrl) {
      if (!avatarDataUrl.startsWith("data:image/")) {
        return NextResponse.json({ error: "Invalid profile image format." }, { status: 400 });
      }
      patch.avatar = avatarDataUrl;
    }

    if (newPassword) {
      patch.password = await hashPassword(newPassword);
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("users")
      .update(patch)
      .eq("id", session.id)
      .select("id,name,email,role,is_admin,first_name,last_name,company,avatar,status")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "Email already exists." }, { status: 409 });
      }
      throw new Error(error.message);
    }

    await setSessionCookie({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role,
      is_admin: !!data.is_admin,
      admin_id: session.admin_id || null,
      admin_name: session.admin_name || null,
      company: data.company,
      status: data.status || "Active",
    });

    return NextResponse.json({
      user: {
        id: data.id,
        name: data.name,
        firstName: safeString(data.first_name),
        lastName: safeString(data.last_name),
        email: safeString(data.email),
        company: safeString(data.company),
        avatar: safeString(data.avatar),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: e?.message || "Failed to update profile." }, { status: 500 });
  }
}
